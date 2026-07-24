import { Clapperboard, Film, Home, LayoutDashboard, LogIn, Ticket, UserRound } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    navigate('/');
  }

  const customerItems = user?.role === 'user'
    ? [
        { to: '/', label: 'Home', icon: Home },
        { to: '/movies', label: 'Movies', icon: Film },
        { to: '/bookings', label: 'Bookings', icon: Ticket },
        { to: '/profile', label: 'Profile', icon: UserRound },
      ]
    : [];

  const guestItems = !user
    ? [
        { to: '/', label: 'Home', icon: Home },
        { to: '/movies', label: 'Movies', icon: Film },
        { to: '/login', label: 'Sign in', icon: LogIn },
      ]
    : [];

  const adminItems = user?.role === 'admin'
    ? [{ to: '/admin', label: 'Admin studio', icon: LayoutDashboard }]
    : [];

  const navigationItems = [...customerItems, ...guestItems, ...adminItems];

  return <>
    <header className="site-nav simplified-header">
      <Link className="brand" to={user?.role === 'admin' ? '/admin' : '/'}>
        <span className="brand-mark"><Clapperboard /></span><span>CINEVERSE</span>
      </Link>
      {user && <div className="nav-user desktop-user"><UserRound size={17} /><span>{user.first_name}</span><button onClick={signOut}>Logout</button></div>}
      {!user && <Link className="primary-button compact desktop-join" to="/register">Join now</Link>}
    </header>

    <div className="app-content"><Outlet /></div>

    <nav className={`ios-bottom-nav ${user?.role === 'admin' ? 'admin-bottom-nav' : ''}`} aria-label="Primary navigation">
      {navigationItems.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'}>
          <Icon size={21} />
          <span>{label}</span>
        </NavLink>
      ))}
      {user && <button type="button" onClick={signOut}><LogIn size={21} /><span>Logout</span></button>}
    </nav>
  </>;
}
