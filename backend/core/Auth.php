<?php

declare(strict_types=1);

final class Auth
{
    public static function user(): ?array
    {
        return $_SESSION['user'] ?? null;
    }

    public static function requireUser(): array
    {
        $user = self::user();
        if ($user === null) {
            Response::json(['message' => 'Authentication required.'], 401);
        }
        return $user;
    }

    public static function requireAdmin(): array
    {
        $user = self::requireUser();
        if (($user['role'] ?? '') !== 'admin') {
            Response::json(['message' => 'Administrator access required.'], 403);
        }
        return $user;
    }
}
