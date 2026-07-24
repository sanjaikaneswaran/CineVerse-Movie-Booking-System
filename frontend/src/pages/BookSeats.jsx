import { Armchair, ChevronLeft, Info, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';

export default function BookSeats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/showtimes/${id}/seats`)
      .then((response) => setSeats(response.data.seats ?? []))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [id]);

  const rows = useMemo(() => seats.reduce((grouped, seat) => {
    (grouped[seat.row_label] ??= []).push(seat);
    return grouped;
  }, {}), [seats]);

  const selectedSeats = seats.filter((seat) => selectedSeatIds.includes(Number(seat.id)));
  const estimatedTotal = selectedSeats.reduce((sum, seat) => sum + Number(seat.price ?? 0), 0);

  function toggleSeat(seat) {
    if (Number(seat.is_booked) === 1) return;
    const seatId = Number(seat.id);
    setSelectedSeatIds((current) => {
      if (current.includes(seatId)) return current.filter((idValue) => idValue !== seatId);
      if (current.length >= 10) {
        setError('You can select a maximum of 10 seats.');
        return current;
      }
      setError('');
      return [...current, seatId];
    });
  }

  function proceedToCheckout() {
    navigate(`/checkout/${id}`, {
      state: {
        seatIds: selectedSeatIds,
        seats: selectedSeats,
        showtime: location.state?.showtime,
        movie: location.state?.movie,
      },
    });
  }

  return (
    <main className="booking-page section-shell">
      <button className="text-button" onClick={() => navigate(-1)}><ChevronLeft size={18} /> Back</button>
      <div className="booking-heading">
        <div><span className="kicker">SELECT SEATS</span><h1>Pick the perfect view.</h1></div>
        <div className="stepper"><b className="active">1</b><span /><b>2</b><span /><b>3</b></div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {loading ? <div className="skeleton-panel" /> : (
        <div className="seat-layout-card">
          <div className="cinema-screen"><span>SCREEN</span></div>
          <div className="seat-map">
            {Object.entries(rows).map(([rowLabel, rowSeats]) => (
              <motion.div className="seat-row" key={rowLabel} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <span className="row-label">{rowLabel}</span>
                <div className="row-seats">
                  {rowSeats.map((seat, index) => {
                    const isBooked = Number(seat.is_booked) === 1;
                    const isSelected = selectedSeatIds.includes(Number(seat.id));
                    return (
                      <button
                        type="button"
                        key={seat.id}
                        disabled={isBooked}
                        onClick={() => toggleSeat(seat)}
                        title={`${seat.row_label}${seat.seat_number} · ${seat.seat_type}`}
                        className={`cinema-seat ${seat.seat_type} ${isSelected ? 'selected' : ''} ${index === 4 ? 'aisle-after' : ''}`}
                      >
                        <Armchair size={20} />
                        <small>{seat.seat_number}</small>
                      </button>
                    );
                  })}
                </div>
                <span className="row-label">{rowLabel}</span>
              </motion.div>
            ))}
          </div>
          <div className="seat-legend">
            <span><i className="legend-seat available" /> Available</span>
            <span><i className="legend-seat selected" /> Selected</span>
            <span><i className="legend-seat premium" /> Premium</span>
            <span><i className="legend-seat booked" /> Booked</span>
          </div>
        </div>
      )}

      <div className="booking-bottom-bar">
        <div className="selection-copy">
          <Ticket size={24} />
          <div><small>{selectedSeatIds.length} seat(s) selected</small><strong>{selectedSeats.map((seat) => `${seat.row_label}${seat.seat_number}`).join(', ') || 'Choose your seats'}</strong></div>
        </div>
        <div className="estimated-total"><small>Estimated total</small><strong>LKR {estimatedTotal.toFixed(2)}</strong></div>
        <button className="primary-button" disabled={!selectedSeatIds.length} onClick={proceedToCheckout}>Continue to payment</button>
      </div>
      <p className="security-note"><Info size={15} /> Seat availability is checked again during payment.</p>
    </main>
  );
}
