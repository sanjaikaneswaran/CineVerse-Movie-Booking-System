import { X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    try {
      await register(form);
      navigate('/movies');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return <section className="auth">
    <form onSubmit={submit} className="auth-form-with-close">
      <button type="button" className="auth-close" onClick={() => navigate('/')} aria-label="Back to home"><X /></button>
      <p className="eyebrow">JOIN CINEVERSE</p>
      <h1>Create your account</h1>
      {error && <div className="alert error">{error}</div>}
      <label>First name (e.g., Sahan)<input required value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></label>
      <label>Last name (e.g., Dinusha)<input required value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></label>
      <label>Email (e.g., sahan@example.com)<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label>Phone (e.g., +1234567890)<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
      <label>Password (e.g., at least 8 characters)<input required minLength="8" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
      <button className="primary-button">Create account</button>
    </form>
  </section>;
}
