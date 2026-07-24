import { ArrowRight, BadgeCheck, Play, Popcorn, Sparkles, TicketCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { resolveImagePath } from '../utils/imagePath';

function showLabel(showtime) {
  if (!showtime) return 'SHOWTIMES AVAILABLE';
  return `${showtime.screen_type || showtime.screen_name} · ${String(showtime.start_time).slice(0, 5)}`;
}

export default function Home() {
  const [spotlight, setSpotlight] = useState(null);

  useEffect(() => {
    api.get('/featured-movie')
      .then((response) => setSpotlight(response.data))
      .catch(() => setSpotlight(null));
  }, []);

  const featuredMovie = spotlight?.movie;
  const ticketImage = resolveImagePath(featuredMovie?.poster_url || featuredMovie?.backdrop_url, '');

  return <main>
    {/* Keep the main cinema-reel background from app.css unchanged. */}
    <section className="home-hero">
      <div className="hero-noise" />
      <motion.div className="home-copy" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .75 }}>
        <span className="kicker"><Sparkles size={14} /> A NEW CINEMA UNIVERSE</span>
        <h1>Don’t just watch.<br /><em>Feel the story.</em></h1>
        <p>Discover the latest movies, choose your exact seat, complete a simulated payment, and carry your digital ticket—all in one premium experience.</p>
        <div className="hero-buttons">
          <Link className="primary-button large" to="/movies">Explore movies <ArrowRight size={19} /></Link>
          {featuredMovie && <Link className="secondary-button large" to={`/movies/${featuredMovie.id}`}><Play size={18} fill="currentColor" /> View spotlight</Link>}
        </div>
        <div className="hero-proof"><span><BadgeCheck /> Secure booking flow</span><span><TicketCheck /> Instant digital ticket</span></div>
      </motion.div>

      <Link
        to={featuredMovie ? `/movies/${featuredMovie.id}` : '/movies'}
        className="floating-ticket floating-ticket-with-poster"
      >
        {ticketImage && <div className="floating-ticket-poster" style={{ backgroundImage: `url(${ticketImage})` }} />}
        <div className="floating-ticket-overlay" />
        <div className="floating-ticket-content">
          <span>NOW SHOWING</span>
          <strong>{featuredMovie?.title || 'CINEVERSE'}</strong>
          <small>{showLabel(spotlight?.next_showtime)}</small>
        </div>
      </Link>
    </section>

    <section id="experience" className="experience-section section-shell">
      <div className="section-title-row">
        <div><span className="kicker">THE CINEVERSE DIFFERENCE</span><h2>Every step feels cinematic.</h2></div>
        <p>Strong UI is not decoration. It should make the booking flow faster, clearer, and more trustworthy.</p>
      </div>
      <div className="feature-grid">
        <article><span><Popcorn /></span><h3>Discover</h3><p>Search curated releases through immersive posters, trailers, and rich movie details.</p></article>
        <article><span><TicketCheck /></span><h3>Select</h3><p>Choose real seats from an interactive cinema layout with premium pricing visible.</p></article>
        <article><span><BadgeCheck /></span><h3>Confirm</h3><p>Complete a safe dummy payment and receive an instant QR-style digital ticket.</p></article>
      </div>
    </section>
  </main>;
}
