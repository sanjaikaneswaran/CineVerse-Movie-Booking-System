import {
  CalendarClock,
  CalendarPlus,
  Check,
  CircleDollarSign,
  Film,
  Clapperboard,
  LayoutDashboard,
  MessageSquareText,
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  Save,
  RotateCcw,
  ScreenShare,
  Star,
  UsersRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const TIME_SLOTS = [
  { value: '08:00', label: '08:00 AM · Morning show' },
  { value: '12:00', label: '12:00 PM · Matinee' },
  { value: '16:00', label: '04:00 PM · Evening show' },
  { value: '21:00', label: '09:00 PM · Night show' },
];

function currency(value) {
  return `LKR ${Number(value || 0).toFixed(2)}`;
}

export default function Admin() {
  const [tab, setTab] = useState('dashboard');
  const [movies, setMovies] = useState([]);
  const [screens, setScreens] = useState([]);
  const [dashboard, setDashboard] = useState({ summary: {}, today_showtimes: [] });
  const [users, setUsers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [movie, setMovie] = useState({
    title: '', description: '', duration_minutes: 120, language: 'English', age_rating: 'PG-13',
    release_date: '', status: 'upcoming',
    poster_url: '/uploads/movies/posters/movie-poster.jpg',
    backdrop_url: '/uploads/movies/backdrops/movie-backdrop.jpg',
    trailer_url: 'https://youtube.com',
  });
  const [showtime, setShowtime] = useState({ movie_id: '', screen_id: '1', show_date: '', start_time: '08:00', base_price: '1200' });
  const [screen, setScreen] = useState({ name: '', screen_type: 'Standard', row_count: 8, seats_per_row: 10 });
  const [featuredMovieId, setFeaturedMovieId] = useState('');
  const [movieSearch, setMovieSearch] = useState('');
  const [editingMovieId, setEditingMovieId] = useState(null);

  const selectedScreen = useMemo(
    () => screens.find((screen) => String(screen.id) === String(showtime.screen_id)),
    [screens, showtime.screen_id],
  );

  async function loadAll() {
    const [movieResponse, screenResponse, dashboardResponse, userResponse, feedbackResponse, featuredResponse] = await Promise.all([
      api.get('/movies'),
      api.get('/admin/screens'),
      api.get('/admin/dashboard'),
      api.get('/admin/users'),
      api.get('/admin/feedback'),
      api.get('/featured-movie'),
    ]);
    setMovies(movieResponse.data.movies || []);
    setScreens(screenResponse.data.screens || []);
    setDashboard(dashboardResponse.data || { summary: {}, today_showtimes: [] });
    setUsers(userResponse.data.users || []);
    setFeedback(feedbackResponse.data.feedback || []);
    setFeaturedMovieId(featuredResponse.data.movie ? String(featuredResponse.data.movie.id) : '');
  }

  useEffect(() => {
    loadAll().catch((requestError) => setError(requestError.message));
  }, []);

  function clearAlerts() {
    setMessage('');
    setError('');
  }

  function resetMovieForm() {
    setEditingMovieId(null);
    setMovie({
      title: '',
      description: '',
      duration_minutes: 120,
      language: 'English',
      age_rating: 'PG-13',
      release_date: '',
      status: 'upcoming',
      poster_url: '/uploads/movies/posters/movie-poster.jpg',
      backdrop_url: '/uploads/movies/backdrops/movie-backdrop.jpg',
      trailer_url: 'https://youtube.com',
    });
  }

  function startEditingMovie(selectedMovie) {
    clearAlerts();
    setEditingMovieId(Number(selectedMovie.id));
    setMovie({
      title: selectedMovie.title || '',
      description: selectedMovie.description || '',
      duration_minutes: selectedMovie.duration_minutes || 120,
      language: selectedMovie.language || 'English',
      age_rating: selectedMovie.age_rating || 'PG-13',
      release_date: selectedMovie.release_date || '',
      status: selectedMovie.status || 'upcoming',
      poster_url: selectedMovie.poster_url || '',
      backdrop_url: selectedMovie.backdrop_url || '',
      trailer_url: selectedMovie.trailer_url || '',
    });
    setTab('manageMovies');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function addMovie(event) {
    event.preventDefault();
    clearAlerts();
    try {
      const response = await api.post('/admin/movies', movie);
      setMessage(response.data.message);
      resetMovieForm();
      await loadAll();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function updateMovie(event) {
    event.preventDefault();
    if (!editingMovieId) return;
    clearAlerts();
    try {
      const response = await api.put(`/admin/movies/${editingMovieId}`, movie);
      setMessage(response.data.message);
      resetMovieForm();
      await loadAll();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteMovie(selectedMovie) {
    const confirmed = window.confirm(
      `Delete “${selectedMovie.title}”? This permanently removes the movie, its showtimes and feedback when no booking history exists.`,
    );
    if (!confirmed) return;

    clearAlerts();
    try {
      const response = await api.delete(`/admin/movies/${selectedMovie.id}`);
      setMessage(response.data.message);
      if (editingMovieId === Number(selectedMovie.id)) resetMovieForm();
      await loadAll();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function addShowtime(event) {
    event.preventDefault();
    clearAlerts();
    try {
      const response = await api.post('/admin/showtimes', showtime);
      setMessage(response.data.message);
      setShowtime((current) => ({ ...current, show_date: '' }));
      await loadAll();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function addScreen(event) {
    event.preventDefault();
    clearAlerts();
    try {
      const response = await api.post('/admin/screens', screen);
      setMessage(response.data.message);
      setScreen({ name: '', screen_type: 'Standard', row_count: 8, seats_per_row: 10 });
      await loadAll();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function updateFeaturedMovie(event) {
    event.preventDefault();
    clearAlerts();
    try {
      const response = await api.patch('/admin/featured-movie', { movie_id: Number(featuredMovieId) });
      setMessage(response.data.message);
      await loadAll();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function updateFeedbackStatus(feedbackId, status) {
    clearAlerts();
    try {
      const response = await api.patch(`/admin/feedback/${feedbackId}/status`, { status });
      setMessage(response.data.message);
      await loadAll();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const filteredAdminMovies = useMemo(() => {
    const query = movieSearch.trim().toLowerCase();
    if (!query) return movies;
    return movies.filter((item) =>
      [item.title, item.language, item.status, item.age_rating]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [movies, movieSearch]);

  const titles = {
    dashboard: ['Live operations.', 'Today’s cinema activity at a glance.'],
    movie: ['Create a new release.', 'Publish a movie before assigning screenings.'],
    manageMovies: ['Manage the movie catalogue.', 'Search, edit, archive or safely delete existing movies.'],
    showtime: ['Schedule a screening.', 'Choose a movie, screen, date and approved time slot.'],
    screen: ['Create a cinema screen.', 'Define the room type and automatically generate its seat layout.'],
    spotlight: ['Homepage Now Showing.', 'Choose which Now Showing movie appears inside the homepage ticket.'],
    feedback: ['Audience feedback.', 'Review, approve or reject customer comments.'],
    users: ['Registered customers.', 'View customer contact details and booking activity.'],
  };

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <div><span className="brand-mark"><Film /></span><strong>Admin Studio</strong></div>
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}><LayoutDashboard />Dashboard</button>
        <button className={tab === 'movie' ? 'active' : ''} onClick={() => { resetMovieForm(); setTab('movie'); }}><PlusCircle />Add movie</button>
        <button className={tab === 'manageMovies' ? 'active' : ''} onClick={() => setTab('manageMovies')}><Pencil />Manage movies</button>
        <button className={tab === 'showtime' ? 'active' : ''} onClick={() => setTab('showtime')}><CalendarPlus />Add showtime</button>
        <button className={tab === 'spotlight' ? 'active' : ''} onClick={() => setTab('spotlight')}><Clapperboard />Now showing spotlight</button>
        <button className={tab === 'screen' ? 'active' : ''} onClick={() => setTab('screen')}><ScreenShare />Add screen</button>
        <button className={tab === 'feedback' ? 'active' : ''} onClick={() => setTab('feedback')}><MessageSquareText />Feedback <span className="admin-count">{dashboard.summary?.pending_feedback || 0}</span></button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}><UsersRound />Users</button>
        <div className="admin-note"><ScreenShare /><p>A screen cannot host two movies at the same date and time.</p></div>
      </aside>

      <section className="admin-content admin-content-wide">
        <span className="kicker">CINEVERSE CONTROL ROOM</span>
        <h1>{titles[tab][0]}</h1>
        <p className="admin-subtitle">{titles[tab][1]}</p>
        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert error">{error}</div>}

        {tab === 'dashboard' && (
          <>
            <div className="admin-stat-grid">
              <article><Film /><small>Movies</small><strong>{dashboard.summary?.movies || 0}</strong></article>
              <article><UsersRound /><small>Customers</small><strong>{dashboard.summary?.users || 0}</strong></article>
              <article><CalendarClock /><small>Active bookings</small><strong>{dashboard.summary?.bookings || 0}</strong></article>
              <article><MessageSquareText /><small>Pending feedback</small><strong>{dashboard.summary?.pending_feedback || 0}</strong></article>
              <article><CircleDollarSign /><small>Today revenue</small><strong>{currency(dashboard.summary?.today_revenue)}</strong></article>
            </div>

            <div className="admin-panel">
              <div className="admin-panel-heading"><div><span className="kicker">TODAY</span><h2>Available screenings</h2></div><span>{dashboard.today_showtimes?.length || 0} shows</span></div>
              {dashboard.today_showtimes?.length ? (
                <div className="today-show-list">
                  {dashboard.today_showtimes.map((item) => {
                    const occupancy = item.total_seats ? Math.round((Number(item.booked_seats) / Number(item.total_seats)) * 100) : 0;
                    return (
                      <article key={item.id}>
                        <div className="today-time">{String(item.start_time).slice(0, 5)}</div>
                        <div><strong>{item.movie_title}</strong><span>{item.screen_name} · {item.screen_type}</span></div>
                        <div className="occupancy"><span>{item.booked_seats}/{item.total_seats} booked</span><div><i style={{ width: `${occupancy}%` }} /></div></div>
                        <strong>{currency(item.base_price)}</strong>
                      </article>
                    );
                  })}
                </div>
              ) : <div className="empty-state"><h3>No shows scheduled today</h3><p>Add a showtime using the approved time slots.</p></div>}
            </div>
          </>
        )}

        {tab === 'movie' && (
          <form className="admin-form" onSubmit={addMovie}>
            <label className="full">Movie title<input required value={movie.title} onChange={(event) => setMovie({ ...movie, title: event.target.value })} /></label>
            <label className="full">Description<textarea required rows="5" value={movie.description} onChange={(event) => setMovie({ ...movie, description: event.target.value })} /></label>
            <label>Duration (minutes)<input type="number" min="1" required value={movie.duration_minutes} onChange={(event) => setMovie({ ...movie, duration_minutes: event.target.value })} /></label>
            <label>Language<input required value={movie.language} onChange={(event) => setMovie({ ...movie, language: event.target.value })} /></label>
            <label>Age rating<input value={movie.age_rating} onChange={(event) => setMovie({ ...movie, age_rating: event.target.value })} /></label>
            <label>Release date<input type="date" required value={movie.release_date} onChange={(event) => setMovie({ ...movie, release_date: event.target.value })} /></label>
            <label>Status<select value={movie.status} onChange={(event) => setMovie({ ...movie, status: event.target.value })}><option value="upcoming">Upcoming</option><option value="now_showing">Now showing</option><option value="archived">Archived</option></select></label>
            <label>Trailer URL<input value={movie.trailer_url} onChange={(event) => setMovie({ ...movie, trailer_url: event.target.value })} /></label>
            <label className="full">Poster image path<input required placeholder="/uploads/movies/posters/movie-poster.jpg" value={movie.poster_url} onChange={(event) => setMovie({ ...movie, poster_url: event.target.value })} /></label>
            <label className="full">Backdrop image path<input placeholder="/uploads/movies/backdrops/movie-backdrop.jpg" value={movie.backdrop_url} onChange={(event) => setMovie({ ...movie, backdrop_url: event.target.value })} /></label>
            <button className="primary-button full">Publish movie</button>
          </form>
        )}

        {tab === 'manageMovies' && (
          <div className="movie-management-layout">
            {editingMovieId && (
              <form className="admin-form movie-edit-form" onSubmit={updateMovie}>
                <div className="admin-form-heading full">
                  <div><span className="kicker">EDIT MOVIE #{editingMovieId}</span><h2>{movie.title || 'Movie details'}</h2></div>
                  <button type="button" className="secondary-button compact" onClick={resetMovieForm}><RotateCcw size={16} />Cancel edit</button>
                </div>
                <label className="full">Movie title<input required value={movie.title} onChange={(event) => setMovie({ ...movie, title: event.target.value })} /></label>
                <label className="full">Description<textarea required rows="4" value={movie.description} onChange={(event) => setMovie({ ...movie, description: event.target.value })} /></label>
                <label>Duration (minutes)<input type="number" min="1" required value={movie.duration_minutes} onChange={(event) => setMovie({ ...movie, duration_minutes: event.target.value })} /></label>
                <label>Language<input required value={movie.language} onChange={(event) => setMovie({ ...movie, language: event.target.value })} /></label>
                <label>Age rating<input value={movie.age_rating} onChange={(event) => setMovie({ ...movie, age_rating: event.target.value })} /></label>
                <label>Release date<input type="date" required value={movie.release_date} onChange={(event) => setMovie({ ...movie, release_date: event.target.value })} /></label>
                <label>Status<select value={movie.status} onChange={(event) => setMovie({ ...movie, status: event.target.value })}><option value="upcoming">Upcoming</option><option value="now_showing">Now showing</option><option value="archived">Archived</option></select></label>
                <label>Trailer URL<input value={movie.trailer_url} onChange={(event) => setMovie({ ...movie, trailer_url: event.target.value })} /></label>
                <label className="full">Poster image path<input required value={movie.poster_url} onChange={(event) => setMovie({ ...movie, poster_url: event.target.value })} /></label>
                <label className="full">Backdrop image path<input value={movie.backdrop_url} onChange={(event) => setMovie({ ...movie, backdrop_url: event.target.value })} /></label>
                <button className="primary-button full"><Save size={17} />Save movie changes</button>
              </form>
            )}

            <div className="admin-panel movie-manager-panel">
              <div className="admin-panel-heading">
                <div><span className="kicker">CATALOGUE</span><h2>Existing movies</h2></div>
                <span>{filteredAdminMovies.length} movies</span>
              </div>
              <label className="admin-movie-search"><Search size={18} /><input value={movieSearch} onChange={(event) => setMovieSearch(event.target.value)} placeholder="Search title, status, language or rating..." /></label>
              <div className="admin-movie-grid">
                {filteredAdminMovies.map((item) => (
                  <article className="admin-movie-card" key={item.id}>
                    <img src={item.poster_url} alt={`${item.title} poster`} onError={(event) => { event.currentTarget.src = '/uploads/ui/image-placeholder.svg'; }} />
                    <div className="admin-movie-card-body">
                      <div className="admin-movie-card-top"><span className={`status-badge ${item.status}`}>{String(item.status).replace('_', ' ')}</span><small>#{item.id}</small></div>
                      <h3>{item.title}</h3>
                      <p>{item.language} · {item.duration_minutes} min · {item.age_rating}</p>
                      <small>Released {new Date(`${item.release_date}T00:00:00`).toLocaleDateString()}</small>
                      <div className="admin-movie-actions">
                        <button className="secondary-button compact" onClick={() => startEditingMovie(item)}><Pencil size={15} />Edit</button>
                        <button className="danger-button compact" onClick={() => deleteMovie(item)}><Trash2 size={15} />Delete</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!filteredAdminMovies.length && <div className="empty-state"><h3>No matching movies</h3><p>Try another search term.</p></div>}
            </div>
          </div>
        )}

        {tab === 'showtime' && (
          <form className="admin-form showtime-admin-form" onSubmit={addShowtime}>
            <label className="full">Movie<select required value={showtime.movie_id} onChange={(event) => setShowtime({ ...showtime, movie_id: event.target.value })}><option value="">Select movie</option>{movies.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <label>Screen<select required value={showtime.screen_id} onChange={(event) => setShowtime({ ...showtime, screen_id: event.target.value })}>{screens.map((screen) => <option key={screen.id} value={screen.id}>{screen.name} · {screen.screen_type}</option>)}</select></label>
            <label>Time slot<select required value={showtime.start_time} onChange={(event) => setShowtime({ ...showtime, start_time: event.target.value })}>{TIME_SLOTS.map((slot) => <option key={slot.value} value={slot.value}>{slot.label}</option>)}</select></label>
            <label>Show date<input type="date" required value={showtime.show_date} onChange={(event) => setShowtime({ ...showtime, show_date: event.target.value })} /></label>
            <label>Base price (LKR)<input type="number" min="1" required value={showtime.base_price} onChange={(event) => setShowtime({ ...showtime, base_price: event.target.value })} /></label>
            <div className="screen-rule full"><ScreenShare /><div><strong>{selectedScreen?.name || 'Select a screen'} {selectedScreen ? `· ${selectedScreen.screen_type}` : ''}</strong><p>The same screen, date and time cannot be assigned to another movie. The backend checks this again before saving.</p></div></div>
            <button className="primary-button full">Create showtime</button>
          </form>
        )}



        {tab === 'spotlight' && (
          <form className="admin-form spotlight-form" onSubmit={updateFeaturedMovie}>
            <label className="full">Homepage Now Showing movie
              <select required value={featuredMovieId} onChange={(event) => setFeaturedMovieId(event.target.value)}>
                <option value="">Select a Now Showing movie</option>
                {movies.filter((item) => item.status === 'now_showing').map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
            <div className="screen-rule full"><Clapperboard /><div><strong>Homepage spotlight</strong><p>The selected movie controls the floating ticket poster, title and next available showtime. The main homepage background remains unchanged. Only movies with status “Now showing” are available here.</p></div></div>
            <button className="primary-button full">Update homepage movie</button>
          </form>
        )}

        {tab === 'screen' && (
          <form className="admin-form" onSubmit={addScreen}>
            <label className="full">Screen name<input required placeholder="Example: Screen 3" value={screen.name} onChange={(event) => setScreen({ ...screen, name: event.target.value })} /></label>
            <label>Screen type<select value={screen.screen_type} onChange={(event) => setScreen({ ...screen, screen_type: event.target.value })}><option>Standard</option><option>IMAX</option><option>Dolby Atmos</option><option>3D</option><option>VIP</option></select></label>
            <label>Number of rows<input type="number" min="1" max="26" required value={screen.row_count} onChange={(event) => setScreen({ ...screen, row_count: event.target.value })} /></label>
            <label>Seats per row<input type="number" min="1" max="30" required value={screen.seats_per_row} onChange={(event) => setScreen({ ...screen, seats_per_row: event.target.value })} /></label>
            <div className="screen-rule full"><ScreenShare /><div><strong>{Number(screen.row_count || 0) * Number(screen.seats_per_row || 0)} seats will be created</strong><p>The final two rows are generated as premium seats. All other rows are standard seats.</p></div></div>
            <button className="primary-button full">Create screen and seats</button>
          </form>
        )}

        {tab === 'feedback' && (
          <div className="admin-panel feedback-inbox">
            <div className="admin-panel-heading"><div><span className="kicker">CUSTOMER VOICE</span><h2>Feedback inbox</h2></div><span>{feedback.length} total</span></div>
            {feedback.length ? feedback.map((item) => (
              <article className="feedback-admin-card" key={item.id}>
                <div className="feedback-admin-top"><div><strong>{item.first_name} {item.last_name}</strong><span>{item.email}</span></div><span className={`status-badge ${item.status}`}>{item.status}</span></div>
                <h3>{item.movie_title}</h3>
                <div className="star-row">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={16} fill={index < item.rating ? 'currentColor' : 'none'} />)}</div>
                <p>{item.comment}</p>
                <div className="feedback-actions"><button onClick={() => updateFeedbackStatus(item.id, 'approved')}><Check />Approve</button><button className="danger" onClick={() => updateFeedbackStatus(item.id, 'rejected')}><X />Reject</button></div>
              </article>
            )) : <div className="empty-state"><h3>No feedback yet</h3></div>}
          </div>
        )}

        {tab === 'users' && (
          <div className="admin-panel">
            <div className="admin-panel-heading"><div><span className="kicker">CUSTOMERS</span><h2>Registered users</h2></div><span>{users.length} users</span></div>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Contact</th><th>Joined</th><th>Bookings</th><th>Total spent</th></tr></thead><tbody>{users.map((item) => <tr key={item.id}><td><strong>{item.first_name} {item.last_name}</strong><small>#{item.id}</small></td><td><span>{item.email}</span><small>{item.phone || 'No phone'}</small></td><td>{new Date(item.created_at).toLocaleDateString()}</td><td>{item.booking_count}</td><td>{currency(item.total_spent)}</td></tr>)}</tbody></table></div>
          </div>
        )}
      </section>
    </main>
  );
}
