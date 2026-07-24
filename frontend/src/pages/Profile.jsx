import { KeyRound, Save, UserRound } from 'lucide-react';
import { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, setCurrentUser } = useAuth();
  const [profile, setProfile] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function saveProfile(event) {
    event.preventDefault(); setMessage(''); setError('');
    try {
      const response = await api.patch('/profile', profile);
      setCurrentUser(response.data.user);
      setMessage(response.data.message);
    } catch (requestError) { setError(requestError.message); }
  }

  async function changePassword(event) {
    event.preventDefault(); setMessage(''); setError('');
    if (passwords.new_password !== passwords.confirm_password) { setError('New passwords do not match.'); return; }
    try {
      const response = await api.patch('/profile/password', passwords);
      setMessage(response.data.message);
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (requestError) { setError(requestError.message); }
  }

  return <main className="section-shell profile-page">
    <span className="kicker">ACCOUNT</span><h1>My profile</h1><p className="admin-subtitle">Manage your personal details and keep your password secure.</p>
    {message && <div className="alert success">{message}</div>}{error && <div className="alert error">{error}</div>}
    <div className="profile-grid">
      <form className="profile-card" onSubmit={saveProfile}>
        <div className="profile-card-heading"><UserRound /><div><h2>Personal details</h2><span>{user?.email}</span></div></div>
        <label>First name<input required value={profile.first_name} onChange={(event) => setProfile({ ...profile, first_name: event.target.value })} /></label>
        <label>Last name<input required value={profile.last_name} onChange={(event) => setProfile({ ...profile, last_name: event.target.value })} /></label>
        <label>Phone<input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
        <button className="primary-button"><Save size={18} />Save details</button>
      </form>
      <form className="profile-card" onSubmit={changePassword}>
        <div className="profile-card-heading"><KeyRound /><div><h2>Change password</h2><span>Use at least 8 characters.</span></div></div>
        <label>Current password<input required type="password" value={passwords.current_password} onChange={(event) => setPasswords({ ...passwords, current_password: event.target.value })} /></label>
        <label>New password<input required minLength="8" type="password" value={passwords.new_password} onChange={(event) => setPasswords({ ...passwords, new_password: event.target.value })} /></label>
        <label>Confirm new password<input required minLength="8" type="password" value={passwords.confirm_password} onChange={(event) => setPasswords({ ...passwords, confirm_password: event.target.value })} /></label>
        <button className="primary-button"><KeyRound size={18} />Update password</button>
      </form>
    </div>
  </main>;
}
