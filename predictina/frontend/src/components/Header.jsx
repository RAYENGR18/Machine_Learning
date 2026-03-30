import styles from './Header.module.css';

export default function Header({ apiStatus }) {
  const badgeClass =
    apiStatus === 'online'  ? styles.badgeOnline :
    apiStatus === 'offline' ? styles.badgeOffline :
    styles.badge;

  const badgeText =
    apiStatus === 'online'  ? 'API online' :
    apiStatus === 'offline' ? 'API offline' :
    'checking api…';

  return (
    <header className={styles.header}>
      <div className={styles.logoMark}>P<span>.</span></div>
      <div>
        <p className={styles.sub}>Tunisia Real Estate</p>
        <p className={styles.title}>Predictina — House Price Intelligence</p>
      </div>
      <div className={`${styles.badge} ${badgeClass}`}>{badgeText}</div>
    </header>
  );
}
