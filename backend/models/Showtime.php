<?php

declare(strict_types=1);

final class Showtime
{
    public function __construct(private PDO $database) {}

    public function forMovie(int $movieId): array
    {
        $statement = $this->database->prepare(
            "SELECT showtimes.*, screens.name AS screen_name, screens.screen_type
             FROM showtimes
             INNER JOIN screens ON screens.id = showtimes.screen_id
             WHERE showtimes.movie_id = :movie_id
               AND showtimes.status = 'scheduled'
               AND TIMESTAMP(showtimes.show_date, showtimes.start_time) >= NOW()
             ORDER BY showtimes.show_date, showtimes.start_time, screens.name"
        );
        $statement->execute(['movie_id' => $movieId]);
        return $statement->fetchAll();
    }

    public function screens(): array
    {
        return $this->database
            ->query("SELECT id, name, screen_type, total_seats FROM screens WHERE is_active = 1 ORDER BY id")
            ->fetchAll();
    }


    public function createScreen(array $data): int
    {
        $name = trim((string) ($data['name'] ?? ''));
        $screenType = trim((string) ($data['screen_type'] ?? 'Standard'));
        $rowCount = (int) ($data['row_count'] ?? 8);
        $seatsPerRow = (int) ($data['seats_per_row'] ?? 10);

        if ($name === '') {
            throw new RuntimeException('Screen name is required.');
        }
        if ($rowCount < 1 || $rowCount > 26 || $seatsPerRow < 1 || $seatsPerRow > 30) {
            throw new RuntimeException('Rows must be 1-26 and seats per row must be 1-30.');
        }

        $duplicate = $this->database->prepare('SELECT id FROM screens WHERE name = :name LIMIT 1');
        $duplicate->execute(['name' => $name]);
        if ($duplicate->fetch()) {
            throw new RuntimeException('A screen with this name already exists.');
        }

        $totalSeats = $rowCount * $seatsPerRow;
        $this->database->beginTransaction();
        try {
            $screenStatement = $this->database->prepare(
                'INSERT INTO screens (name, screen_type, total_seats, is_active) VALUES (:name, :screen_type, :total_seats, 1)'
            );
            $screenStatement->execute(['name' => $name, 'screen_type' => $screenType, 'total_seats' => $totalSeats]);
            $screenId = (int) $this->database->lastInsertId();

            $seatStatement = $this->database->prepare(
                'INSERT INTO seats (screen_id, row_label, seat_number, seat_type, price_multiplier)
                 VALUES (:screen_id, :row_label, :seat_number, :seat_type, :price_multiplier)'
            );
            for ($row = 0; $row < $rowCount; $row++) {
                $isPremium = $row >= max(0, $rowCount - 2);
                for ($seatNumber = 1; $seatNumber <= $seatsPerRow; $seatNumber++) {
                    $seatStatement->execute([
                        'screen_id' => $screenId,
                        'row_label' => chr(65 + $row),
                        'seat_number' => $seatNumber,
                        'seat_type' => $isPremium ? 'premium' : 'standard',
                        'price_multiplier' => $isPremium ? 1.30 : 1.00,
                    ]);
                }
            }
            $this->database->commit();
            return $screenId;
        } catch (Throwable $exception) {
            if ($this->database->inTransaction()) {
                $this->database->rollBack();
            }
            throw $exception;
        }
    }

    public function today(): array
    {
        $statement = $this->database->query(
            "SELECT showtimes.id, showtimes.show_date, showtimes.start_time, showtimes.base_price,
                    movies.id AS movie_id, movies.title AS movie_title,
                    screens.id AS screen_id, screens.name AS screen_name, screens.screen_type,
                    COUNT(booking_items.id) AS booked_seats,
                    screens.total_seats
             FROM showtimes
             INNER JOIN movies ON movies.id = showtimes.movie_id
             INNER JOIN screens ON screens.id = showtimes.screen_id
             LEFT JOIN booking_items ON booking_items.showtime_id = showtimes.id
             WHERE showtimes.show_date = CURDATE()
               AND showtimes.status = 'scheduled'
             GROUP BY showtimes.id
             ORDER BY showtimes.start_time, screens.name"
        );
        return $statement->fetchAll();
    }

    public function seats(int $showtimeId): array
    {
        $statement = $this->database->prepare(
            "SELECT seats.id, seats.row_label, seats.seat_number, seats.seat_type,
                    seats.price_multiplier,
                    ROUND(showtimes.base_price * seats.price_multiplier, 2) AS price,
                    showtimes.base_price,
                    CASE WHEN booking_items.id IS NULL THEN 0 ELSE 1 END AS is_booked
             FROM showtimes
             INNER JOIN seats ON seats.screen_id = showtimes.screen_id AND seats.is_active = 1
             LEFT JOIN booking_items ON booking_items.showtime_id = showtimes.id
                                    AND booking_items.seat_id = seats.id
             WHERE showtimes.id = :showtime_id
             ORDER BY seats.row_label, seats.seat_number"
        );
        $statement->execute(['showtime_id' => $showtimeId]);
        return $statement->fetchAll();
    }

    public function create(array $data): int
    {
        $movieId = (int) ($data['movie_id'] ?? 0);
        $screenId = (int) ($data['screen_id'] ?? 0);
        $showDate = trim((string) ($data['show_date'] ?? ''));
        $startTime = trim((string) ($data['start_time'] ?? ''));
        $basePrice = (float) ($data['base_price'] ?? 0);

        $allowedTimes = ['08:00', '12:00', '16:00', '21:00'];
        if (!in_array(substr($startTime, 0, 5), $allowedTimes, true)) {
            throw new RuntimeException('Please select one of the available time slots: 08:00, 12:00, 16:00 or 21:00.');
        }
        if ($movieId < 1 || $screenId < 1 || $showDate === '' || $basePrice <= 0) {
            throw new RuntimeException('Movie, screen, date, time and price are required.');
        }

        $conflict = $this->database->prepare(
            "SELECT showtimes.id, movies.title
             FROM showtimes
             INNER JOIN movies ON movies.id = showtimes.movie_id
             WHERE showtimes.screen_id = :screen_id
               AND showtimes.show_date = :show_date
               AND showtimes.start_time = :start_time
               AND showtimes.status = 'scheduled'
             LIMIT 1"
        );
        $conflict->execute([
            'screen_id' => $screenId,
            'show_date' => $showDate,
            'start_time' => $startTime,
        ]);
        $existing = $conflict->fetch();
        if ($existing) {
            throw new RuntimeException("This screen is already assigned to {$existing['title']} at the selected date and time. Choose another screen or time.");
        }

        $statement = $this->database->prepare(
            'INSERT INTO showtimes (movie_id, screen_id, show_date, start_time, base_price)
             VALUES (:movie_id, :screen_id, :show_date, :start_time, :base_price)'
        );
        $statement->execute([
            'movie_id' => $movieId,
            'screen_id' => $screenId,
            'show_date' => $showDate,
            'start_time' => $startTime,
            'base_price' => $basePrice,
        ]);
        return (int) $this->database->lastInsertId();
    }
}
