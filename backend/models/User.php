<?php

declare(strict_types=1);

final class User
{
    public function __construct(private PDO $database) {}

    public function findByEmail(string $email): ?array
    {
        $sql = "SELECT users.id, users.first_name, users.last_name, users.email,
                       users.password_hash, users.phone, users.is_active,
                       roles.name AS role
                FROM users
                INNER JOIN roles ON roles.id = users.role_id
                WHERE users.email = :email
                LIMIT 1";
        $statement = $this->database->prepare($sql);
        $statement->execute(['email' => $email]);
        $user = $statement->fetch();
        return $user ?: null;
    }

    public function create(array $data): array
    {
        $roleStatement = $this->database->prepare("SELECT id FROM roles WHERE name = 'user' LIMIT 1");
        $roleStatement->execute();
        $roleId = (int) $roleStatement->fetchColumn();

        $statement = $this->database->prepare(
            'INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone)
             VALUES (:role_id, :first_name, :last_name, :email, :password_hash, :phone)'
        );
        $statement->execute([
            'role_id' => $roleId,
            'first_name' => trim((string) $data['first_name']),
            'last_name' => trim((string) $data['last_name']),
            'email' => strtolower(trim((string) $data['email'])),
            'password_hash' => password_hash((string) $data['password'], PASSWORD_DEFAULT),
            'phone' => trim((string) ($data['phone'] ?? '')) ?: null,
        ]);

        return $this->findByEmail((string) $data['email']) ?? [];
    }


    public function findById(int $userId): ?array
    {
        $statement = $this->database->prepare(
            "SELECT users.id, users.first_name, users.last_name, users.email,
                    users.password_hash, users.phone, users.is_active,
                    roles.name AS role
             FROM users
             INNER JOIN roles ON roles.id = users.role_id
             WHERE users.id = :user_id
             LIMIT 1"
        );
        $statement->execute(['user_id' => $userId]);
        $user = $statement->fetch();
        return $user ?: null;
    }

    public function updateProfile(int $userId, array $data): array
    {
        $firstName = trim((string) ($data['first_name'] ?? ''));
        $lastName = trim((string) ($data['last_name'] ?? ''));
        $phone = trim((string) ($data['phone'] ?? ''));
        if ($firstName === '' || $lastName === '') {
            throw new RuntimeException('First name and last name are required.');
        }
        $statement = $this->database->prepare(
            'UPDATE users SET first_name = :first_name, last_name = :last_name, phone = :phone WHERE id = :user_id'
        );
        $statement->execute([
            'first_name' => $firstName,
            'last_name' => $lastName,
            'phone' => $phone !== '' ? $phone : null,
            'user_id' => $userId,
        ]);
        return self::safe($this->findById($userId) ?? []);
    }

    public function changePassword(int $userId, string $currentPassword, string $newPassword): void
    {
        if (strlen($newPassword) < 8) {
            throw new RuntimeException('New password must contain at least 8 characters.');
        }
        $user = $this->findById($userId);
        if (!$user || !password_verify($currentPassword, (string) $user['password_hash'])) {
            throw new RuntimeException('Current password is incorrect.');
        }
        $statement = $this->database->prepare('UPDATE users SET password_hash = :password_hash WHERE id = :user_id');
        $statement->execute([
            'password_hash' => password_hash($newPassword, PASSWORD_DEFAULT),
            'user_id' => $userId,
        ]);
    }

    public function allCustomers(): array
    {
        return $this->database->query(
            "SELECT users.id, users.first_name, users.last_name, users.email, users.phone,
                    users.is_active, users.created_at, roles.name AS role,
                    COUNT(DISTINCT bookings.id) AS booking_count,
                    COALESCE(SUM(CASE WHEN bookings.status = 'confirmed' THEN bookings.total_amount ELSE 0 END), 0) AS total_spent
             FROM users
             INNER JOIN roles ON roles.id = users.role_id
             LEFT JOIN bookings ON bookings.user_id = users.id
             WHERE roles.name = 'user'
             GROUP BY users.id
             ORDER BY users.created_at DESC"
        )->fetchAll();
    }

    public static function safe(array $user): array
    {
        unset($user['password_hash'], $user['is_active']);
        return $user;
    }
}
