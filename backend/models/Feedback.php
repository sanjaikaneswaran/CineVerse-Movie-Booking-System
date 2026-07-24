<?php

declare(strict_types=1);

final class Feedback
{
    public function __construct(private PDO $database) {}

    public function create(int $userId, int $movieId, int $rating, string $comment): void
    {
        if ($rating < 1 || $rating > 5) {
            throw new RuntimeException('Rating must be between 1 and 5.');
        }
        if (trim($comment) === '') {
            throw new RuntimeException('Please write a short feedback comment.');
        }

        $statement = $this->database->prepare(
            "INSERT INTO feedback (user_id, movie_id, rating, comment, status)
             VALUES (:user_id, :movie_id, :rating, :comment, 'pending')
             ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), status = 'pending', created_at = CURRENT_TIMESTAMP"
        );
        $statement->execute([
            'user_id' => $userId,
            'movie_id' => $movieId,
            'rating' => $rating,
            'comment' => trim($comment),
        ]);
    }

    public function approvedForMovie(int $movieId): array
    {
        $statement = $this->database->prepare(
            "SELECT feedback.id, feedback.rating, feedback.comment, feedback.created_at,
                    users.first_name, users.last_name
             FROM feedback
             INNER JOIN users ON users.id = feedback.user_id
             WHERE feedback.movie_id = :movie_id
               AND feedback.status = 'approved'
             ORDER BY feedback.created_at DESC"
        );
        $statement->execute(['movie_id' => $movieId]);
        return $statement->fetchAll();
    }

    public function all(): array
    {
        return $this->database->query(
            "SELECT feedback.id, feedback.rating, feedback.comment, feedback.status, feedback.created_at,
                    users.id AS user_id, users.first_name, users.last_name, users.email,
                    movies.id AS movie_id, movies.title AS movie_title
             FROM feedback
             INNER JOIN users ON users.id = feedback.user_id
             INNER JOIN movies ON movies.id = feedback.movie_id
             ORDER BY FIELD(feedback.status, 'pending', 'approved', 'rejected'), feedback.created_at DESC"
        )->fetchAll();
    }

    public function updateStatus(int $feedbackId, string $status): void
    {
        if (!in_array($status, ['pending', 'approved', 'rejected'], true)) {
            throw new RuntimeException('Invalid feedback status.');
        }
        $statement = $this->database->prepare('UPDATE feedback SET status = :status WHERE id = :feedback_id');
        $statement->execute(['status' => $status, 'feedback_id' => $feedbackId]);
        if ($statement->rowCount() === 0) {
            throw new RuntimeException('Feedback not found.');
        }
    }
}
