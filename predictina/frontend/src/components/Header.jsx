import { Link } from 'react-router-dom';
import styles from './Header.module.css';

export default function Header({ apiStatus }) {
  const badgeClass =
    apiStatus === 'online'  ? styles.badgeOnline :
    apiStatus === 'offline' ? styles.badgeOffline :
    styles.badgeOffline;

  const badgeText =
    apiStatus === 'online'  ? 'Model live' :
    apiStatus === 'offline' ? 'API offline' :
    'connecting…';

  return (
    <header className={styles.header}>
      <Link className={styles.brand} to="/">
        <span className={styles.logo}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <path d="M50 18 L82 46 V82 H64 V58 H36 V82 H18 V46 Z"
              fill="none" stroke="currentColor" strokeWidth="6"
              strokeLinejoin="round" strokeLinecap="round" />
            <circle cx="50" cy="12" r="6" fill="var(--gold)" />
          </svg>
        </span>
        <span className={styles.wordmark}>
          <span className={styles.name}>Predictina</span>
          <span className={styles.sub}>House Price Intelligence · Tunisia</span>
        </span>
      </Link>

      <nav className={styles.nav}>
        <a href="/#predictor">Predictor</a>
        <a href="/#compare">City Index</a>
        <Link to="/recommend">Find me a home</Link>
        <a href="/#about">About</a>
      </nav>

      <div className={`${styles.badge} ${badgeClass}`}>
        <span className={styles.dot} />
        {badgeText}
      </div>
    </header>
  );
}
