import { CalendarDays, CreditCard, MapPin, Ticket, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { resolveImagePath } from '../utils/imagePath';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const loadBookings = () => api.get('/bookings/my').then((response) => setBookings(response.data.bookings ?? [])).catch((requestError) => setError(requestError.message));
  useEffect(() => { loadBookings(); }, []);

  async function cancelBooking(bookingId) {
    if (!window.confirm('Cancel this booking and mark its dummy payment as refunded?')) return;
    setBusyId(bookingId); setError('');
    try { await api.patch(`/bookings/${bookingId}/cancel`); await loadBookings(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusyId(null); }
  }

  return (
    <main className="section-shell bookings-page">
      <span className="kicker">MY CINEVERSE</span><h1>Your tickets.</h1><p className="page-intro">Everything you have booked, paid, and cancelled in one place.</p>
      {error && <div className="alert error">{error}</div>}
      {!bookings.length ? <div className="empty-state"><Ticket size={38} /><h2>No bookings yet</h2><p>Your next great story is waiting.</p><Link className="primary-button" to="/movies">Browse movies</Link></div> : (
        <div className="booking-list">{bookings.map((booking) => (
          <article className={`booking-ticket ${booking.status}`} key={booking.id}>
            <div className="booking-poster" style={{ backgroundImage: `url(${resolveImagePath(booking.poster_url)})` }} />
            <div className="booking-main"><div className="booking-title-row"><div><span className={`status-badge ${booking.status}`}>{booking.status}</span><h2>{booking.title}</h2></div><strong className="booking-total">LKR {Number(booking.total_amount).toFixed(2)}</strong></div>
              <div className="booking-meta"><span><CalendarDays />{booking.show_date} · {String(booking.start_time).slice(0,5)}</span><span><MapPin />{booking.screen_name}</span><span><Ticket />Seats {booking.seats || 'Released'}</span><span><CreditCard />{booking.payment_method?.toUpperCase()} · {booking.payment_status}</span></div>
              <div className="booking-footer"><div><small>REFERENCE</small><strong>{booking.reference}</strong></div><div className="ticket-actions"><Link className="secondary-button compact" to={`/booking-success/${booking.id}`}>View ticket</Link>{booking.status === 'confirmed' && <button className="danger-button compact" disabled={busyId === booking.id} onClick={() => cancelBooking(booking.id)}><XCircle size={16} />{busyId === booking.id ? 'Cancelling…' : 'Cancel'}</button>}</div></div>
            </div>
          </article>
        ))}</div>
      )}
    </main>
  );
}
