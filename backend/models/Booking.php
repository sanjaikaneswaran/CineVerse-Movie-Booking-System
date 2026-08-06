<?php

declare(strict_types=1);

final class Booking
{
    public function __construct(private PDO $database) {}

    public function create(
        int $userId,
        int $showtimeId,
        array $seatIds,
        string $paymentMethod,
        string $cardholderName,
        string $cardLastFour
    ): array {
        if ($showtimeId <= 0) {
            throw new RuntimeException('Please select a valid showtime.');
        }

        $seatIds = array_values(array_unique(array_filter(array_map('intval', $seatIds))));
        if ($seatIds === []) {
            throw new RuntimeException('Select at least one seat.');
        }
        if (count($seatIds) > 10) {
            throw new RuntimeException('A maximum of 10 seats can be booked at once.');
        }
        if ($cardholderName === '' || !preg_match('/^\d{4}$/', $cardLastFour)) {
            throw new RuntimeException('Enter valid payment details.');
        }

        $this->database->beginTransaction();

        try {
            $showtime = $this->lockShowtime($showtimeId);
            $seats = $this->lockSelectedSeats((int) $showtime['screen_id'], $seatIds);
            $this->assertSeatsAvailable($showtimeId, $seatIds);

            $totalAmount = $this->calculateTotal((float) $showtime['base_price'], $seats);
            $bookingReference = $this->generateReference();
            $bookingId = $this->insertBooking($userId, $showtimeId, $bookingReference, $totalAmount);
            $this->insertBookingItems($bookingId, $showtimeId, (float) $showtime['base_price'], $seats);
            $transactionReference = $this->insertDummyPayment(
                $bookingId,
                $totalAmount,
                $paymentMethod,
                $cardholderName,
                $cardLastFour
            );

            $this->database->commit();

            return $this->findForUser($bookingId, $userId) + [
                'transaction_reference' => $transactionReference,
            ];
        } catch (Throwable $exception) {
            if ($this->database->inTransaction()) {
                $this->database->rollBack();
            }
            throw $exception;
        }
    }

    public function forUser(int $userId): array
    {
        $statement = $this->database->prepare($this->bookingSelectSql() . "
            WHERE bookings.user_id = :user_id
            GROUP BY bookings.id
            ORDER BY bookings.created_at DESC
        ");
        $statement->execute(['user_id' => $userId]);
        return $statement->fetchAll();
    }

    public function findForUser(int $bookingId, int $userId): array
    {
        $statement = $this->database->prepare($this->bookingSelectSql() . "
            WHERE bookings.id = :booking_id AND bookings.user_id = :user_id
            GROUP BY bookings.id
            LIMIT 1
        ");
        $statement->execute([
            'booking_id' => $bookingId,
            'user_id' => $userId,
        ]);
        $booking = $statement->fetch();
        if (!$booking) {
            throw new RuntimeException('Booking not found.');
        }
        return $booking;
    }

    public function cancel(int $bookingId, int $userId): void
    {
        $this->database->beginTransaction();
        try {
            $statement = $this->database->prepare(
                "SELECT bookings.id, showtimes.show_date, showtimes.start_time
                 FROM bookings
                 INNER JOIN showtimes ON showtimes.id = bookings.showtime_id
                 WHERE bookings.id = :booking_id
                   AND bookings.user_id = :user_id
                   AND bookings.status = 'confirmed'
                 FOR UPDATE"
            );
            $statement->execute(['booking_id' => $bookingId, 'user_id' => $userId]);
            $booking = $statement->fetch();
            if (!$booking) {
                throw new RuntimeException('Booking cannot be cancelled.');
            }

            $showDateTime = new DateTimeImmutable($booking['show_date'] . ' ' . $booking['start_time']);
            if ($showDateTime <= new DateTimeImmutable('+2 hours')) {
                throw new RuntimeException('Bookings can only be cancelled at least 2 hours before the show.');
            }

            $this->database->prepare(
                'DELETE FROM booking_items WHERE booking_id = :booking_id'
            )->execute(['booking_id' => $bookingId]);

            $this->database->prepare(
                "UPDATE payments
                 SET status = 'refunded'
                 WHERE booking_id = :booking_id AND status = 'paid'"
            )->execute(['booking_id' => $bookingId]);

            $this->database->prepare(
                "UPDATE bookings
                 SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
                 WHERE id = :booking_id"
            )->execute(['booking_id' => $bookingId]);

            $this->database->commit();
        } catch (Throwable $exception) {
            if ($this->database->inTransaction()) {
                $this->database->rollBack();
            }
            throw $exception;
        }
    }

    private function lockShowtime(int $showtimeId): array
    {
        $statement = $this->database->prepare(
            "SELECT showtimes.id, showtimes.base_price, showtimes.screen_id,
                    showtimes.show_date, showtimes.start_time,
                    movies.title, movies.poster_url, screens.name AS screen_name
             FROM showtimes
             INNER JOIN movies ON movies.id = showtimes.movie_id
             INNER JOIN screens ON screens.id = showtimes.screen_id
             WHERE showtimes.id = :showtime_id
               AND showtimes.status = 'scheduled'
               AND TIMESTAMP(showtimes.show_date, showtimes.start_time) > NOW()
             FOR UPDATE"
        );
        $statement->execute(['showtime_id' => $showtimeId]);
        $showtime = $statement->fetch();
        if (!$showtime) {
            throw new RuntimeException('The selected showtime is unavailable.');
        }
        return $showtime;
    }

    private function lockSelectedSeats(int $screenId, array $seatIds): array
    {
        $placeholders = implode(',', array_fill(0, count($seatIds), '?'));
        $statement = $this->database->prepare(
            "SELECT id, row_label, seat_number, seat_type, price_multiplier
             FROM seats
             WHERE screen_id = ? AND id IN ($placeholders) AND is_active = 1
             ORDER BY row_label, seat_number
             FOR UPDATE"
        );
        $statement->execute(array_merge([$screenId], $seatIds));
        $seats = $statement->fetchAll();
        if (count($seats) !== count($seatIds)) {
            throw new RuntimeException('One or more selected seats are invalid.');
        }
        return $seats;
    }

    private function assertSeatsAvailable(int $showtimeId, array $seatIds): void
    {
        $placeholders = implode(',', array_fill(0, count($seatIds), '?'));
        $statement = $this->database->prepare(
            "SELECT seat_id FROM booking_items
             WHERE showtime_id = ? AND seat_id IN ($placeholders)
             LIMIT 1"
        );
        $statement->execute(array_merge([$showtimeId], $seatIds));
        if ($statement->fetch()) {
            throw new RuntimeException('One or more selected seats were just booked by another customer.');
        }
    }

    private function calculateTotal(float $basePrice, array $seats): float
    {
        $total = 0.0;
        foreach ($seats as $seat) {
            $total += $basePrice * (float) $seat['price_multiplier'];
        }
        return round($total + 150.00, 2);
    }

    private function insertBooking(int $userId, int $showtimeId, string $reference, float $total): int
    {
        $statement = $this->database->prepare(
            'INSERT INTO bookings (user_id, showtime_id, reference, total_amount, status)
             VALUES (:user_id, :showtime_id, :reference, :total_amount, \'confirmed\')'
        );
        $statement->execute([
            'user_id' => $userId,
            'showtime_id' => $showtimeId,
            'reference' => $reference,
            'total_amount' => $total,
        ]);
        return (int) $this->database->lastInsertId();
    }

    private function insertBookingItems(int $bookingId, int $showtimeId, float $basePrice, array $seats): void
    {
        $statement = $this->database->prepare(
            'INSERT INTO booking_items (booking_id, showtime_id, seat_id, unit_price)
             VALUES (:booking_id, :showtime_id, :seat_id, :unit_price)'
        );
        foreach ($seats as $seat) {
            $statement->execute([
                'booking_id' => $bookingId,
                'showtime_id' => $showtimeId,
                'seat_id' => (int) $seat['id'],
                'unit_price' => round($basePrice * (float) $seat['price_multiplier'], 2),
            ]);
        }
    }

    private function insertDummyPayment(
        int $bookingId,
        float $amount,
        string $method,
        string $cardholderName,
        string $cardLastFour
    ): string {
        $allowedMethods = ['visa', 'mastercard', 'amex'];
        $safeMethod = in_array($method, $allowedMethods, true) ? $method : 'visa';
        $transactionReference = 'PAY-' . strtoupper(bin2hex(random_bytes(5)));
        /*
         * Keep dummy payment storage compatible with both the original and
         * upgraded CineVerse database. Sensitive card data is never stored.
         * Only the payment method and generated transaction reference are saved.
         */
        $statement = $this->database->prepare(
            "INSERT INTO payments
             (booking_id, amount, method, status, transaction_reference, paid_at)
             VALUES (:booking_id, :amount, :method, 'paid', :reference, CURRENT_TIMESTAMP)"
        );
        $statement->execute([
            'booking_id' => $bookingId,
            'amount' => $amount,
            'method' => $safeMethod,
            'reference' => $transactionReference,
        ]);
        return $transactionReference;
    }

    private function generateReference(): string
    {
        return 'CV-' . date('ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
    }

    private function bookingSelectSql(): string
    {
        return "SELECT bookings.id, bookings.reference, bookings.total_amount, bookings.status,
                       bookings.created_at, bookings.cancelled_at,
                       movies.id AS movie_id, movies.title, movies.poster_url,
                       showtimes.show_date, showtimes.start_time,
                       screens.name AS screen_name, screens.screen_type,
                       payments.method AS payment_method,
                       payments.status AS payment_status,
                       payments.transaction_reference,
                       GROUP_CONCAT(CONCAT(seats.row_label, seats.seat_number)
                           ORDER BY seats.row_label, seats.seat_number SEPARATOR ', ') AS seats
                FROM bookings
                INNER JOIN showtimes ON showtimes.id = bookings.showtime_id
                INNER JOIN movies ON movies.id = showtimes.movie_id
                INNER JOIN screens ON screens.id = showtimes.screen_id
                LEFT JOIN booking_items ON booking_items.booking_id = bookings.id
                LEFT JOIN seats ON seats.id = booking_items.seat_id
                LEFT JOIN payments ON payments.booking_id = bookings.id";
    }
}
