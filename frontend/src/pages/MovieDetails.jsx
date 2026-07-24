import { Clock3, Languages, MessageSquareText, Play, Star, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { resolveImagePath } from '../utils/imagePath';
import { useAuth } from '../context/AuthContext';

function parseDate(value) { return new Date(`${value}T00:00:00`); }
function sameDay(a, b) { return a.toDateString() === b.toDateString(); }
function tabLabel(dateValue) {
  const date = parseDate(dateValue); const today = new Date(); const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    day: date.getDate(),
    caption: sameDay(date, today) ? 'Today' : sameDay(date, tomorrow) ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short' }),
  };
}

export default function MovieDetails() {
  const { id } = useParams(); const navigate = useNavigate(); const { user } = useAuth();
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [selectedDate, setSelectedDate] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState(''); const [feedbackError, setFeedbackError] = useState('');
  const [feedbackForm, setFeedbackForm] = useState({ rating: 5, comment: '' });

  async function loadMovie() { const response = await api.get(`/movies/${id}`); setData(response.data); }
  useEffect(() => { loadMovie().catch((requestError) => setError(requestError.message)); }, [id]);

  const dates = useMemo(() => [...new Set((data?.showtimes || []).map((item) => item.show_date))], [data]);
  useEffect(() => { if (!selectedDate && dates.length) setSelectedDate(dates[0]); }, [dates, selectedDate]);
  const selectedSessions = useMemo(() => (data?.showtimes || []).filter((item) => item.show_date === selectedDate), [data, selectedDate]);

  if (error) return <main className="section-shell"><div className="alert error">{error}</div></main>;
  if (!data) return <div className="page-loader"><span /></div>;
  const { movie } = data;

  function selectShowtime(showtime) {
    if (!user) { navigate('/login', { state: { from: `/movies/${id}` } }); return; }
    navigate(`/book/${showtime.id}`, { state: { movie, showtime } });
  }

  async function submitFeedback(event) {
    event.preventDefault(); if (!user) { navigate('/login', { state: { from: `/movies/${id}` } }); return; }
    setFeedbackMessage(''); setFeedbackError('');
    try { const response = await api.post('/feedback', { movie_id: Number(id), rating: Number(feedbackForm.rating), comment: feedbackForm.comment }); setFeedbackMessage(`${response.data.message} It will appear after admin approval.`); setFeedbackForm({ rating: 5, comment: '' }); }
    catch (requestError) { setFeedbackError(requestError.message); }
  }

  return <main>
    <section className="movie-hero" style={{ backgroundImage: `linear-gradient(90deg,#050609 2%,rgba(5,6,9,.88) 34%,rgba(5,6,9,.28) 78%),url(${resolveImagePath(movie.backdrop_url || movie.poster_url, '/uploads/ui/cinema-hero-placeholder.svg')})` }}>
      <motion.div className="movie-hero-content" initial={{ opacity: 0, x: -25 }} animate={{ opacity: 1, x: 0 }}>
        <span className="kicker">{movie.genres || 'CINEVERSE PREMIERE'}</span><h1>{movie.title}</h1>
        <div className="movie-meta"><span><Star size={16} fill="currentColor" /> 8.7</span><span><Clock3 size={16} /> {movie.duration_minutes} min</span><span><Languages size={16} /> {movie.language}</span><span className="rating-chip">{movie.age_rating}</span></div>
        <p>{movie.description}</p><div className="hero-buttons"><a className="secondary-button" href={movie.trailer_url} target="_blank" rel="noreferrer"><Play size={18} fill="currentColor" /> Watch trailer</a><a className="primary-button" href="#showtimes"><Ticket size={18} /> Book tickets</a></div>
      </motion.div>
    </section>

    <section id="showtimes" className="showtime-booking-zone">
      <div className="showtime-date-tabs" role="tablist">
        {dates.map((dateValue) => { const label = tabLabel(dateValue); return <button key={dateValue} className={selectedDate === dateValue ? 'active' : ''} onClick={() => setSelectedDate(dateValue)}><small>{label.month}</small><strong>{label.day}</strong><span>{label.caption}</span></button>; })}
      </div>
      <div className="section-shell showtime-content-shell">
        <div className="cinema-venue-heading"><div><span className="kicker">AVAILABLE SESSIONS</span><h2>{movie.title}</h2></div><span>{selectedSessions.length} show{selectedSessions.length === 1 ? '' : 's'} on this date</span></div>
        {selectedSessions.length ? <div className="venue-show-card"><div className="venue-name"><strong>CineVerse Cinema</strong><span>Select a time and screen</span></div><div className="venue-times">{selectedSessions.map((showtime) => <button key={showtime.id} onClick={() => selectShowtime(showtime)}><strong>{String(showtime.start_time).slice(0, 5)}</strong><span>{showtime.screen_name}</span><small>{showtime.screen_type} · LKR {Number(showtime.base_price).toFixed(2)}</small></button>)}</div></div> : <div className="empty-state"><h3>No sessions on this date</h3></div>}
      </div>
    </section>

    <section className="section-shell feedback-section"><div className="section-title-row"><div><span className="kicker">AUDIENCE VOICE</span><h2>Ratings & feedback</h2></div><p>Share your experience. Admin reviews comments before publishing.</p></div><div className="feedback-layout"><form className="feedback-form" onSubmit={submitFeedback}><div className="feedback-form-heading"><MessageSquareText /><div><strong>Write your feedback</strong><span>{user ? `Posting as ${user.first_name}` : 'Sign in to submit'}</span></div></div><label>Rating<select value={feedbackForm.rating} onChange={(event) => setFeedbackForm({ ...feedbackForm, rating: event.target.value })}><option value="5">5 · Excellent</option><option value="4">4 · Very good</option><option value="3">3 · Good</option><option value="2">2 · Fair</option><option value="1">1 · Poor</option></select></label><label>Comment<textarea rows="3" required value={feedbackForm.comment} onChange={(event) => setFeedbackForm({ ...feedbackForm, comment: event.target.value })} /></label>{feedbackMessage && <div className="alert success">{feedbackMessage}</div>}{feedbackError && <div className="alert error">{feedbackError}</div>}<button className="primary-button">Submit feedback</button></form><div className="published-feedback">{(data.feedback || []).length ? data.feedback.map((item) => <article key={item.id}><div><strong>{item.first_name} {item.last_name}</strong><span>{new Date(item.created_at).toLocaleDateString()}</span></div><div className="star-row">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={16} fill={index < item.rating ? 'currentColor' : 'none'} />)}</div><p>{item.comment}</p></article>) : <div className="empty-state"><h3>No approved feedback yet</h3></div>}</div></div></section>
  </main>;
}
