import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Movies from './pages/Movies';
import MovieDetails from './pages/MovieDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import BookSeats from './pages/BookSeats';
import Checkout from './pages/Checkout';
import BookingSuccess from './pages/BookingSuccess';
import Bookings from './pages/Bookings';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import './styles/app.css';

function ProtectedRoute({ children, adminOnly = false, customerOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader"><span /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  if (customerOnly && user.role !== 'user') return <Navigate to="/admin" replace />;
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/movies/:id" element={<MovieDetails />} />
            <Route path="/book/:id" element={<ProtectedRoute customerOnly><BookSeats /></ProtectedRoute>} />
            <Route path="/checkout/:id" element={<ProtectedRoute customerOnly><Checkout /></ProtectedRoute>} />
            <Route path="/booking-success/:id" element={<ProtectedRoute customerOnly><BookingSuccess /></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute customerOnly><Bookings /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute customerOnly><Profile /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
