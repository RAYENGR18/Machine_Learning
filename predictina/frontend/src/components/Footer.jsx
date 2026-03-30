import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      Predictina v2.0 · Powered by LightGBM / XGBoost / Random Forest · MLflow tracked
    </footer>
  );
}
