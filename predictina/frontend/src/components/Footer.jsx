import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer} id="about">
      <div className={styles.inner}>
        <div className={styles.col}>
          <div className={styles.brandRow}>
            <svg className={styles.logo} viewBox="0 0 100 100" aria-hidden="true">
              <path d="M50 18 L82 46 V82 H64 V58 H36 V82 H18 V46 Z"
                fill="none" stroke="currentColor" strokeWidth="7"
                strokeLinejoin="round" strokeLinecap="round" />
              <circle cx="50" cy="12" r="6" fill="var(--gold)" />
            </svg>
            <span className={styles.brandName}>Predictina</span>
          </div>
          <p className={styles.tag}>AI-powered house price intelligence for the Tunisian real-estate market.</p>
        </div>

        <div className={styles.col}>
          <p className={styles.colTitle}>Engine</p>
          <p className={styles.colText}>LightGBM · XGBoost · Random Forest</p>
          <p className={styles.colText}>Trained on Tunisian listings · MLflow tracked</p>
        </div>

        <div className={styles.col}>
          <p className={styles.colTitle}>Coverage</p>
          <p className={styles.colText}>11 governorates · TND pricing</p>
          <p className={styles.colText}>Apartments · Houses · Villas</p>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} Predictina · House Price Intelligence</span>
        <span className={styles.version}>v2.0</span>
      </div>
    </footer>
  );
}
