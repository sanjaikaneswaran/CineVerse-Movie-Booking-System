<?php

declare(strict_types=1);

session_name('cineverse_session');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => false,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Movie.php';
require_once __DIR__ . '/../models/Showtime.php';
require_once __DIR__ . '/../models/Booking.php';
require_once __DIR__ . '/../models/Feedback.php';

try {
    $database = (new Database())->connect();
    $userModel = new User($database);
    $movieModel = new Movie($database);
    $showtimeModel = new Showtime($database);
    $bookingModel = new Booking($database);
    $feedbackModel = new Feedback($database);

    $route = trim((string) ($_GET['route'] ?? ''), '/');
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($route === 'health' && $method === 'GET') {
        $database->query('SELECT 1');
        Response::json(['success' => true, 'message' => 'Backend and database are connected.']);
    }

    if ($route === 'auth/me' && $method === 'GET') {
        Response::json(['user' => Auth::user()]);
    }

    if ($route === 'auth/login' && $method === 'POST') {
        $data = Response::input();
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $password = (string) ($data['password'] ?? '');
        $user = $userModel->findByEmail($email);
        if (!$user || !(bool) $user['is_active'] || !password_verify($password, (string) $user['password_hash'])) {
            Response::json(['message' => 'Invalid email or password.'], 422);
        }
        $_SESSION['user'] = User::safe($user);
        Response::json(['message' => 'Login successful.', 'user' => $_SESSION['user']]);
    }

    if ($route === 'auth/register' && $method === 'POST') {
        $data = Response::input();
        foreach (['first_name', 'last_name', 'email', 'password'] as $field) {
            if (trim((string) ($data[$field] ?? '')) === '') {
                Response::json(['message' => "{$field} is required."], 422);
            }
        }
        if ($userModel->findByEmail((string) $data['email'])) {
            Response::json(['message' => 'Email is already registered.'], 409);
        }
        $user = User::safe($userModel->create($data));
        $_SESSION['user'] = $user;
        Response::json(['message' => 'Registration successful.', 'user' => $user], 201);
    }


    if ($route === 'profile' && $method === 'PATCH') {
        $authenticatedUser = Auth::requireUser();
        if (($authenticatedUser['role'] ?? '') !== 'user') {
            Response::json(['message' => 'Customer profile access only.'], 403);
        }
        $updatedUser = $userModel->updateProfile((int) $authenticatedUser['id'], Response::input());
        $_SESSION['user'] = $updatedUser;
        Response::json(['message' => 'Profile updated successfully.', 'user' => $updatedUser]);
    }

    if ($route === 'profile/password' && $method === 'PATCH') {
        $authenticatedUser = Auth::requireUser();
        if (($authenticatedUser['role'] ?? '') !== 'user') {
            Response::json(['message' => 'Customer profile access only.'], 403);
        }
        $data = Response::input();
        $userModel->changePassword(
            (int) $authenticatedUser['id'],
            (string) ($data['current_password'] ?? ''),
            (string) ($data['new_password'] ?? '')
        );
        Response::json(['message' => 'Password changed successfully.']);
    }

    if ($route === 'auth/logout' && $method === 'POST') {
        $_SESSION = [];
        session_destroy();
        Response::json(['message' => 'Logged out.']);
    }

    if ($route === 'movies' && $method === 'GET') {
        Response::json(['movies' => $movieModel->all(trim((string) ($_GET['q'] ?? '')), trim((string) ($_GET['status'] ?? '')))]);
    }

    if ($route === 'featured-movie' && $method === 'GET') {
        $featuredMovie = $movieModel->featured();
        if (!$featuredMovie) {
            $nowShowing = $movieModel->all('', 'now_showing');
            $featuredMovie = $nowShowing[0] ?? null;
        }
        $nextShowtime = null;
        if ($featuredMovie) {
            $shows = $showtimeModel->forMovie((int) $featuredMovie['id']);
            $nextShowtime = $shows[0] ?? null;
        }
        Response::json(['movie' => $featuredMovie, 'next_showtime' => $nextShowtime]);
    }

    if ($route === 'admin/featured-movie' && $method === 'PATCH') {
        Auth::requireAdmin();
        $data = Response::input();
        $movieModel->setFeatured((int) ($data['movie_id'] ?? 0));
        Response::json(['message' => 'Homepage Now Showing movie updated successfully.']);
    }

    if (preg_match('#^movies/(\d+)$#', $route, $matches) && $method === 'GET') {
        $movie = $movieModel->find((int) $matches[1]);
        if (!$movie) Response::json(['message' => 'Movie not found.'], 404);
        Response::json([
            'movie' => $movie,
            'showtimes' => $showtimeModel->forMovie((int) $matches[1]),
            'feedback' => $feedbackModel->approvedForMovie((int) $matches[1]),
        ]);
    }

    if ($route === 'admin/movies' && $method === 'POST') {
        Auth::requireAdmin();
        $movieId = $movieModel->create(Response::input());
        Response::json(['message' => 'Movie created successfully.', 'movie' => $movieModel->find($movieId)], 201);
    }

    if (preg_match('#^admin/movies/(\d+)$#', $route, $matches) && in_array($method, ['PUT', 'PATCH'], true)) {
        Auth::requireAdmin();
        $movieId = (int) $matches[1];
        $movieModel->update($movieId, Response::input());
        Response::json(['message' => 'Movie updated successfully.', 'movie' => $movieModel->find($movieId)]);
    }

    if (preg_match('#^admin/movies/(\d+)$#', $route, $matches) && $method === 'DELETE') {
        Auth::requireAdmin();
        $deleted = $movieModel->delete((int) $matches[1]);
        Response::json(['message' => $deleted ? 'Movie deleted successfully.' : 'Movie not found.'], $deleted ? 200 : 404);
    }

    if ($route === 'admin/showtimes' && $method === 'POST') {
        Auth::requireAdmin();
        $showtimeId = $showtimeModel->create(Response::input());
        Response::json(['message' => 'Showtime created.', 'showtime_id' => $showtimeId], 201);
    }

    if ($route === 'admin/dashboard' && $method === 'GET') {
        Auth::requireAdmin();
        $summary = [
            'movies' => (int) $database->query("SELECT COUNT(*) FROM movies")->fetchColumn(),
            'users' => (int) $database->query("SELECT COUNT(*) FROM users INNER JOIN roles ON roles.id = users.role_id WHERE roles.name = 'user'")->fetchColumn(),
            'bookings' => (int) $database->query("SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'")->fetchColumn(),
            'pending_feedback' => (int) $database->query("SELECT COUNT(*) FROM feedback WHERE status = 'pending'")->fetchColumn(),
            'today_revenue' => (float) $database->query("SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE status = 'confirmed' AND DATE(created_at) = CURDATE()")->fetchColumn(),
        ];
        Response::json([
            'summary' => $summary,
            'today_showtimes' => $showtimeModel->today(),
        ]);
    }


    if ($route === 'admin/screens' && $method === 'POST') {
        Auth::requireAdmin();
        $screenId = $showtimeModel->createScreen(Response::input());
        Response::json(['message' => 'Screen and seat layout created successfully.', 'screen_id' => $screenId], 201);
    }

    if ($route === 'admin/screens' && $method === 'GET') {
        Auth::requireAdmin();
        Response::json(['screens' => $showtimeModel->screens()]);
    }

    if ($route === 'admin/users' && $method === 'GET') {
        Auth::requireAdmin();
        Response::json(['users' => $userModel->allCustomers()]);
    }

    if ($route === 'admin/feedback' && $method === 'GET') {
        Auth::requireAdmin();
        Response::json(['feedback' => $feedbackModel->all()]);
    }

    if (preg_match('#^admin/feedback/(\d+)/status$#', $route, $matches) && $method === 'PATCH') {
        Auth::requireAdmin();
        $payload = Response::input();
        $feedbackModel->updateStatus((int) $matches[1], (string) ($payload['status'] ?? ''));
        Response::json(['message' => 'Feedback status updated.']);
    }

    if (preg_match('#^showtimes/(\d+)/seats$#', $route, $matches) && $method === 'GET') {
        Response::json(['seats' => $showtimeModel->seats((int) $matches[1])]);
    }

    if ($route === 'bookings' && $method === 'POST') {
        $user = Auth::requireUser();
        if (($user['role'] ?? '') !== 'user') Response::json(['message' => 'Administrators cannot book movies.'], 403);
        $data = Response::input();
        $seatIds = array_values(array_unique(array_map('intval', $data['seat_ids'] ?? [])));
        $payment = is_array($data['payment'] ?? null) ? $data['payment'] : [];
        Response::json([
            'message' => 'Payment approved and booking confirmed.',
            'booking' => $bookingModel->create(
                (int) $user['id'],
                (int) ($data['showtime_id'] ?? 0),
                $seatIds,
                trim((string) ($payment['method'] ?? 'visa')),
                trim((string) ($payment['cardholder_name'] ?? '')),
                preg_replace('/\D/', '', (string) ($payment['card_last_four'] ?? ''))
            ),
        ], 201);
    }

    if ($route === 'bookings/my' && $method === 'GET') {
        $user = Auth::requireUser();
        if (($user['role'] ?? '') !== 'user') Response::json(['message' => 'Administrators do not have customer bookings.'], 403);
        Response::json(['bookings' => $bookingModel->forUser((int) $user['id'])]);
    }

    if (preg_match('#^bookings/(\d+)$#', $route, $matches) && $method === 'GET') {
        $user = Auth::requireUser();
        if (($user['role'] ?? '') !== 'user') Response::json(['message' => 'Administrators do not have customer bookings.'], 403);
        Response::json(['booking' => $bookingModel->findForUser((int) $matches[1], (int) $user['id'])]);
    }

    if (preg_match('#^bookings/(\d+)/cancel$#', $route, $matches) && $method === 'PATCH') {
        $user = Auth::requireUser();
        if (($user['role'] ?? '') !== 'user') Response::json(['message' => 'Administrators cannot cancel customer bookings.'], 403);
        $bookingModel->cancel((int) $matches[1], (int) $user['id']);
        Response::json(['message' => 'Booking cancelled.']);
    }

    if ($route === 'feedback' && $method === 'POST') {
        $user = Auth::requireUser();
        if (($user['role'] ?? '') !== 'user') Response::json(['message' => 'Administrators cannot submit customer feedback.'], 403);
        $data = Response::input();
        $feedbackModel->create((int) $user['id'], (int) ($data['movie_id'] ?? 0), (int) ($data['rating'] ?? 0), (string) ($data['comment'] ?? ''));
        Response::json(['message' => 'Feedback saved.'], 201);
    }

    Response::json(['message' => 'Route not found.', 'route' => $route], 404);
} catch (PDOException $exception) {
    Response::json(['message' => 'Database error: ' . $exception->getMessage()], 500);
} catch (Throwable $exception) {
    Response::json(['message' => $exception->getMessage()], 422);
}
