import { CheckCircle2, ChevronLeft, CreditCard, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';

export default function Checkout() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const seats = state?.seats ?? [];
  const seatIds = state?.seatIds ?? [];
  const [form, setForm] = useState({ cardholder_name: '', card_number: '', expiry: '', cvv: '', method: 'visa' });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const subtotal = useMemo(() => seats.reduce((sum, seat) => sum + Number(seat.price ?? 0), 0), [seats]);
  const bookingFee = seats.length ? 150 : 0;
  const grandTotal = subtotal + bookingFee;

  if (!seatIds.length) {
    return <main className="section-shell"><div className="empty-state"><h2>No seats selected</h2><button className="primary-button" onClick={() => navigate(`/book/${id}`)}>Select seats</button></div></main>;
  }

  function updateField(event) {
    const { name, value } = event.target;
    let nextValue = value;
    if (name === 'card_number') nextValue = value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    if (name === 'cvv') nextValue = value.replace(/\D/g, '').slice(0, 3);
    if (name === 'expiry') nextValue = value.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');
    setForm((current) => ({ ...current, [name]: nextValue }));
  }

  async function submitPayment(event) {
    event.preventDefault();
    setError('');
    const digits = form.card_number.replace(/\D/g, '');
    if (form.cardholder_name.trim().length < 3 || digits.length !== 16 || form.expiry.length !== 5 || form.cvv.length !== 3) {
      setError('Enter complete dummy card details. Any 16-digit card number is accepted.');
      return;
    }
    setProcessing(true);
    try {
      const response = await api.post('/bookings', {
        showtime_id: Number(id),
        seat_ids: seatIds,
        payment: {
          method: form.method,
          cardholder_name: form.cardholder_name.trim(),
          card_last_four: digits.slice(-4),
        },
      });
      navigate(`/booking-success/${response.data.booking.id}`, { state: { booking: response.data.booking }, replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="checkout-page section-shell">
      <button className="text-button" onClick={() => navigate(-1)}><ChevronLeft size={18} /> Back to seats</button>
      <div className="booking-heading"><div><span className="kicker">SECURE CHECKOUT</span><h1>One last step.</h1></div><div className="stepper"><b>1</b><span /><b className="active">2</b><span /><b>3</b></div></div>
      {error && <div className="alert error">{error}</div>}
      <div className="checkout-grid">
        <form className="payment-card" onSubmit={submitPayment}>
          <div className="card-heading"><div><CreditCard /><span><strong>Dummy card payment</strong><small>No real payment will be processed</small></span></div><LockKeyhole size={20} /></div>
          <div className="payment-methods">
            {['visa', 'mastercard', 'amex'].map((method) => <button type="button" key={method} onClick={() => setForm((current) => ({ ...current, method }))} className={form.method === method ? 'active' : ''}>{method.toUpperCase()}</button>)}
          </div>
          <label>Cardholder name<input name="cardholder_name" value={form.cardholder_name} onChange={updateField}/></label>
          <label>Card number<div className="input-icon"><CreditCard size={18} /><input name="card_number" value={form.card_number} onChange={updateField} inputMode="numeric" placeholder="4242 4242 4242 4242" /></div></label>
          <div className="two-fields"><label>Expiry<input name="expiry" value={form.expiry} onChange={updateField} inputMode="numeric" placeholder="12/30" /></label><label>CVV<input name="cvv" value={form.cvv} onChange={updateField} inputMode="numeric" placeholder="123" /></label></div>
          <div className="dummy-info"><ShieldCheck size={20} /><p>This is a simulated payment for your university project. Use any 16 digits, any future expiry, and any 3-digit CVV.</p></div>
          <button className="primary-button wide" disabled={processing}>{processing ? 'Processing payment…' : `Pay LKR ${grandTotal.toFixed(2)}`}</button>
        </form>
        <aside className="order-summary">
          <span className="kicker">YOUR ORDER</span><h2>{state?.movie?.title ?? 'Movie booking'}</h2>
          <div className="order-details"><div><small>Showtime</small><strong>{state?.showtime ? `${state.showtime.show_date} · ${String(state.showtime.start_time).slice(0, 5)}` : 'Selected show'}</strong></div><div><small>Seats</small><strong>{seats.map((seat) => `${seat.row_label}${seat.seat_number}`).join(', ')}</strong></div></div>
          <div className="price-lines"><p><span>Tickets</span><b>LKR {subtotal.toFixed(2)}</b></p><p><span>Booking fee</span><b>LKR {bookingFee.toFixed(2)}</b></p><hr /><p className="grand"><span>Total</span><b>LKR {grandTotal.toFixed(2)}</b></p></div>
          <p className="instant-confirm"><CheckCircle2 size={17} /> Instant booking confirmation</p>
        </aside>
      </div>
    </main>
  );
}
