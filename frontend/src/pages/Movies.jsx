import { Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import MovieCard from '../components/MovieCard';

const FILTERS = [
  { value: '', label: 'All movies' },
  { value: 'now_showing', label: 'Now showing' },
  { value: 'upcoming', label: 'Coming soon' }
];

export default function Movies() {
  const [movies, setMovies] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.get('/movies', {
          params: {
            q: query.trim(),
            status
          }
        });

        setMovies(Array.isArray(response.data?.movies) ? response.data.movies : []);
      } catch (requestError) {
        setMovies([]);
        setError(requestError.message || 'Unable to load movies.');
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [query, status]);

  const activeFilterLabel = useMemo(
    () => FILTERS.find((filter) => filter.value === status)?.label || 'All movies',
    [status]
  );

  return (
    <main className="section-shell movies-page compact-catalog redesigned-catalog">
      <header className="catalog-header catalog-header-redesign">
        <div>
          <span className="kicker">CINEVERSE COLLECTION</span>
          <h1>{activeFilterLabel}</h1>
          <p>Browse every release first, then narrow the catalogue by availability.</p>
        </div>

        <label className="catalog-search" aria-label="Search movies">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search by movie title..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </header>

      <section className="catalog-toolbar" aria-label="Movie filters">
        <div className="catalog-tabs catalog-tabs-redesign">
          {FILTERS.map((filter) => (
            <button
              key={filter.value || 'all'}
              type="button"
              className={status === filter.value ? 'active' : ''}
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="catalog-result-count">
          <SlidersHorizontal size={16} />
          <span>{loading ? 'Loading catalogue' : `${movies.length} movie${movies.length === 1 ? '' : 's'}`}</span>
        </div>
      </section>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="compact-movie-grid redesigned-movie-grid">
          {Array.from({ length: 10 }).map((_, index) => (
            <div className="compact-skeleton" key={index} />
          ))}
        </div>
      ) : movies.length ? (
        <div className="compact-movie-grid redesigned-movie-grid">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      ) : (
        <div className="empty-state catalog-empty-state">
          <h2>No matching movies</h2>
          <p>Try another title or change the selected catalogue filter.</p>
          <button type="button" className="secondary-button" onClick={() => { setQuery(''); setStatus(''); }}>
            Show all movies
          </button>
        </div>
      )}
    </main>
  );
}
