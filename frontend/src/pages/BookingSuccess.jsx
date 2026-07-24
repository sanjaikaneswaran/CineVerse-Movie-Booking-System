import { CalendarDays, Check, Download, Film, MapPin, TicketCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import api from '../api/client';
import { resolveImagePath } from '../utils/imagePath';

export default function BookingSuccess() {
  const { id } = useParams();
  const location = useLocation();
  const [booking, setBooking] = useState(location.state?.booking ?? null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!booking) api.get(`/bookings/${id}`).then((response) => setBooking(response.data.booking)).catch((requestError) => setError(requestError.message));
  }, [booking, id]);
  if (error) return <main className="section-shell"><div className="alert error">{error}</div></main>;
  if (!booking) return <div className="page-loader"><span /></div>;
  return (
    <main className="success-page section-shell">
      <div className="success-icon"><Check /></div><span className="kicker">BOOKING CONFIRMED</span><h1>You’re going to the movies.</h1><p>Your dummy payment was approved and your seats are locked.</p>
      <article className="digital-ticket">
        <div className="ticket-poster" style={{ backgroundImage: `url(${resolveImagePath(booking.poster_url)})` }} />
        <div className="ticket-content"><div className="ticket-brand"><Film /> CINEVERSE</div><h2>{booking.title}</h2><div className="ticket-facts"><span><CalendarDays />{booking.show_date} · {String(booking.start_time).slice(0,5)}</span><span><MapPin />{booking.screen_name}</span><span><TicketCheck />Seats {booking.seats}</span></div><div className="ticket-reference"><small>BOOKING REFERENCE</small><strong>{booking.reference}</strong></div></div>
        <div className="qr-placeholder"><div className="qr-grid">{Array.from({ length: 64 }).map((_, index) => <i key={index} className={(index * 7 + Number(id)) % 3 ? 'dark' : ''} />)}</div><small>SCAN AT ENTRY</small></div>
      </article>
      <div className="success-actions"><button className="secondary-button" onClick={() => window.print()}><Download size={18} /> Print ticket</button><Link className="primary-button" to="/bookings">View my bookings</Link></div>
    </main>
  );
}
