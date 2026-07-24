<?php

declare(strict_types=1);

final class Movie
{
    public function __construct(private PDO $database) {}

    public function all(string $search = '', string $status = ''): array
    {
        $sql = "SELECT movies.*,
                       GROUP_CONCAT(DISTINCT genres.name ORDER BY genres.name SEPARATOR ', ') AS genres
                FROM movies
                LEFT JOIN movie_genres ON movie_genres.movie_id = movies.id
                LEFT JOIN genres ON genres.id = movie_genres.genre_id
                WHERE (:search = '' OR movies.title LIKE :search_like)
                  AND (:status = '' OR movies.status = :status_value)
                GROUP BY movies.id
                ORDER BY movies.release_date DESC, movies.id DESC";

        $statement = $this->database->prepare($sql);
        $statement->execute([
            'search' => $search,
            'search_like' => '%' . $search . '%',
            'status' => $status,
            'status_value' => $status,
        ]);

        return $statement->fetchAll();
    }

    private function ensureSettingsTable(): void
    {
        $this->database->exec(
            "CREATE TABLE IF NOT EXISTS app_settings (
                setting_key VARCHAR(80) PRIMARY KEY,
                setting_value VARCHAR(255) NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB"
        );
    }

    public function featured(): ?array
    {
        $this->ensureSettingsTable();
        $statement = $this->database->prepare(
            "SELECT movies.*, GROUP_CONCAT(DISTINCT genres.name ORDER BY genres.name SEPARATOR ', ') AS genres
             FROM app_settings
             INNER JOIN movies ON movies.id = CAST(app_settings.setting_value AS UNSIGNED)
             LEFT JOIN movie_genres ON movie_genres.movie_id = movies.id
             LEFT JOIN genres ON genres.id = movie_genres.genre_id
             WHERE app_settings.setting_key = 'featured_movie_id'
               AND movies.status = 'now_showing'
             GROUP BY movies.id
             LIMIT 1"
        );
        $statement->execute();
        $movie = $statement->fetch();
        return $movie ?: null;
    }

    public function setFeatured(int $movieId): void
    {
        $check = $this->database->prepare(
            "SELECT id FROM movies WHERE id = :movie_id AND status = 'now_showing' LIMIT 1"
        );
        $check->execute(['movie_id' => $movieId]);

        if (!$check->fetch()) {
            throw new RuntimeException('Only a movie marked Now showing can be selected for the homepage spotlight.');
        }

        $this->ensureSettingsTable();
        $statement = $this->database->prepare(
            "INSERT INTO app_settings (setting_key, setting_value)
             VALUES ('featured_movie_id', :movie_id)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
        );
        $statement->execute(['movie_id' => (string) $movieId]);
    }

    public function find(int $movieId): ?array
    {
        $statement = $this->database->prepare(
            "SELECT movies.*, GROUP_CONCAT(DISTINCT genres.name ORDER BY genres.name SEPARATOR ', ') AS genres
             FROM movies
             LEFT JOIN movie_genres ON movie_genres.movie_id = movies.id
             LEFT JOIN genres ON genres.id = movie_genres.genre_id
             WHERE movies.id = :movie_id
             GROUP BY movies.id"
        );
        $statement->execute(['movie_id' => $movieId]);
        $movie = $statement->fetch();
        return $movie ?: null;
    }

    public function create(array $data): int
    {
        $validated = $this->validateMovieData($data);

        $statement = $this->database->prepare(
            'INSERT INTO movies
            (title, description, duration_minutes, language, age_rating, release_date, status, poster_url, backdrop_url, trailer_url)
            VALUES
            (:title, :description, :duration_minutes, :language, :age_rating, :release_date, :status, :poster_url, :backdrop_url, :trailer_url)'
        );
        $statement->execute($validated);

        return (int) $this->database->lastInsertId();
    }

    public function update(int $movieId, array $data): bool
    {
        if ($this->find($movieId) === null) {
            throw new RuntimeException('Movie not found.');
        }

        $validated = $this->validateMovieData($data);
        $validated['movie_id'] = $movieId;

        $statement = $this->database->prepare(
            'UPDATE movies SET
                title = :title,
                description = :description,
                duration_minutes = :duration_minutes,
                language = :language,
                age_rating = :age_rating,
                release_date = :release_date,
                status = :status,
                poster_url = :poster_url,
                backdrop_url = :backdrop_url,
                trailer_url = :trailer_url
             WHERE id = :movie_id'
        );
        $statement->execute($validated);

        if ($validated['status'] !== 'now_showing') {
            $this->ensureSettingsTable();
            $clearFeatured = $this->database->prepare(
                "DELETE FROM app_settings
                 WHERE setting_key = 'featured_movie_id'
                   AND setting_value = :movie_id"
            );
            $clearFeatured->execute(['movie_id' => (string) $movieId]);
        }

        return true;
    }

    public function delete(int $movieId): bool
    {
        if ($this->find($movieId) === null) {
            return false;
        }

        $bookingCheck = $this->database->prepare(
            'SELECT COUNT(*)
             FROM bookings
             INNER JOIN showtimes ON showtimes.id = bookings.showtime_id
             WHERE showtimes.movie_id = :movie_id'
        );
        $bookingCheck->execute(['movie_id' => $movieId]);

        if ((int) $bookingCheck->fetchColumn() > 0) {
            throw new RuntimeException(
                'This movie already has booking history and cannot be permanently deleted. Change its status to Archived instead.'
            );
        }

        $this->database->beginTransaction();

        try {
            $this->ensureSettingsTable();

            $clearFeatured = $this->database->prepare(
                "DELETE FROM app_settings
                 WHERE setting_key = 'featured_movie_id'
                   AND setting_value = :movie_id"
            );
            $clearFeatured->execute(['movie_id' => (string) $movieId]);

            $statement = $this->database->prepare('DELETE FROM movies WHERE id = :movie_id');
            $statement->execute(['movie_id' => $movieId]);

            $deleted = $statement->rowCount() > 0;
            $this->database->commit();
            return $deleted;
        } catch (Throwable $exception) {
            if ($this->database->inTransaction()) {
                $this->database->rollBack();
            }
            throw $exception;
        }
    }

    private function validateMovieData(array $data): array
    {
        $title = trim((string) ($data['title'] ?? ''));
        $description = trim((string) ($data['description'] ?? ''));
        $durationMinutes = (int) ($data['duration_minutes'] ?? 0);
        $releaseDate = trim((string) ($data['release_date'] ?? ''));
        $status = trim((string) ($data['status'] ?? 'upcoming'));
        $posterUrl = trim((string) ($data['poster_url'] ?? ''));

        if ($title === '' || $description === '' || $durationMinutes < 1 || $releaseDate === '' || $posterUrl === '') {
            throw new RuntimeException('Title, description, duration, release date and poster image path are required.');
        }

        $allowedStatuses = ['now_showing', 'upcoming', 'archived'];
        if (!in_array($status, $allowedStatuses, true)) {
            throw new RuntimeException('Invalid movie status.');
        }

        return [
            'title' => $title,
            'description' => $description,
            'duration_minutes' => $durationMinutes,
            'language' => trim((string) ($data['language'] ?? 'English')) ?: 'English',
            'age_rating' => trim((string) ($data['age_rating'] ?? 'PG-13')) ?: 'PG-13',
            'release_date' => $releaseDate,
            'status' => $status,
            'poster_url' => $posterUrl,
            'backdrop_url' => trim((string) ($data['backdrop_url'] ?? '')) ?: null,
            'trailer_url' => trim((string) ($data['trailer_url'] ?? '')) ?: null,
        ];
    }
}
