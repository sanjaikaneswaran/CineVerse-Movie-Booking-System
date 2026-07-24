import { CalendarDays, Clock3, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveImagePath } from '../utils/imagePath';

function formatStatus(status) {
  if (status === 'now_showing') return 'Now showing';
  if (status === 'upcoming') return 'Coming soon';
  return 'Archived';
}

export default function MovieCard({ movie }) {
  return (
    <article className="compact-movie-card redesigned-movie-card">
      <Link className="compact-poster redesigned-poster" to={`/movies/${movie.id}`}>
        <img src={resolveImagePath(movie.poster_url)} alt={`${movie.title} poster`} loading="lazy" onError={(event) => { event.currentTarget.src = '/uploads/ui/image-placeholder.svg'; }} />
        <span className={`catalog-status ${movie.status || 'archived'}`}>{formatStatus(movie.status)}</span>
        <div className="poster-view-action">View movie</div>
      </Link>

      <div className="compact-movie-info redesigned-movie-info">
        <div className="movie-card-title-row">
          <h3><Link to={`/movies/${movie.id}`}>{movie.title}</Link></h3>
          <div className="compact-rating" title="Audience rating">
            <Star size={13} fill="currentColor" />
            <span>{movie.average_rating ? Number(movie.average_rating).toFixed(1) : 'New'}</span>
          </div>
        </div>

        <p className="movie-card-language">{movie.language || 'Language not specified'}</p>

        <div className="compact-card-meta">
          <span><Clock3 size={13} /> {movie.duration_minutes || '—'} min</span>
          <span><CalendarDays size={13} /> {movie.age_rating || 'NR'}</span>
        </div>

        <small>{movie.genres || 'Cinema release'}</small>
      </div>
    </article>
  );
}
