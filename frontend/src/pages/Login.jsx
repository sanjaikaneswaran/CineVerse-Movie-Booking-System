import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const authenticatedUser = await login(email, password);
      navigate(authenticatedUser.role === 'admin' ? '/admin' : '/', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return <section className="auth">
    <form onSubmit={submit}>
      <p className="eyebrow">WELCOME BACK</p>
      <h1>Enter the universe</h1>
      {error && <div className="alert error">{error}</div>}
      <label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Password<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button className="primary-button" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
      <p>New here? <Link to="/register">Create account</Link></p>
    </form>
  </section>;
}
