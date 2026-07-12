import { useState } from 'react';
import '../index.css';
import '../App.css';
import styles from './RecommendPage.module.css';

import { recommend } from '../api/client';
import { useApiStatus } from '../hooks/useApiStatus';

import Header from '../components/Header';
import Footer from '../components/Footer';

const EXAMPLES = [
  "Appartement a Sousse, max 300 mille DT, avec piscine et parking",
  "Villa a louer a Hammamet, 3 chambres, avec jardin",
  "Maison a Sfax, minimum 150 m2, climatisee",
];

const AMENITY_LABELS = {
  piscine: 'Piscine', jardin: 'Jardin', parking: 'Parking',
  ascenseur: 'Ascenseur', climatisation: 'Climatisation',
  securite: 'Sécurité', terrasse: 'Terrasse', meuble: 'Meublé',
  'vue mer': 'Vue mer',
};

const fmt = (n) => new Intl.NumberFormat('fr-TN').format(Math.round(n));

export default function RecommendPage() {
  const apiStatus = useApiStatus();

  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (query.trim().length < 3) return;

    setLoading(true);
    setError(null);
    try {
      const result = await recommend(query.trim());
      setData(result);
    } catch (err) {
      setError(err.message || "Impossible de contacter l'API. Vérifiez que FastAPI tourne sur le port 8000.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const prefs = data?.preferences_detected;
  const results = data?.results || [];

  return (
    <div className="app-wrapper" id="top">
      <Header apiStatus={apiStatus} />

      <section className="hero">
        <div className="hero-inner">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> NLP-powered search · live from mubawab.tn
          </span>
          <h1 className="hero-title">
            Describe your <span className="hl">dream home</span>.
          </h1>
          <p className="hero-sub">
            Écris ce que tu cherches en une phrase — prix, surface, ville, équipements —
            et Predictina va chercher les meilleures annonces en temps réel.
          </p>
        </div>
      </section>

      <main>
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="card-head">
            <p className="card-title">Tes préférences</p>
            <span className="pill">{apiStatus === 'online' ? 'API live' : 'API offline'}</span>
          </div>

          <label className={styles.field}>
            <span className="field-label">Décris ce que tu cherches</span>
            <textarea
              className={styles.textarea}
              rows={3}
              placeholder="Ex: Appartement a Sousse, max 300 mille DT, avec piscine et parking"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <div className={styles.examples}>
            {EXAMPLES.map((ex) => (
              <button
                type="button"
                key={ex}
                className={styles.exampleChip}
                onClick={() => setQuery(ex)}
              >
                {ex}
              </button>
            ))}
          </div>

          <button type="submit" className="predict-btn" disabled={loading || query.trim().length < 3}>
            {loading ? (
              <><span className="btn-spinner" /> Recherche en cours…</>
            ) : (
              <>
                Trouver des annonces
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </>
            )}
          </button>
          <p className="form-hint">Recherche en direct sur mubawab.tn — peut prendre quelques secondes.</p>
        </form>

        {error && (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="error-box">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {prefs && (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <p className="card-title">Préférences détectées</p>
            <div className="tags" style={{ marginTop: '.9rem' }}>
              <span className="tag provided"><span className="tag-k">transaction</span><span className="tag-v">{prefs.transaction_type === 'rent' ? 'location' : 'vente'}</span></span>
              {prefs.property_type && <span className="tag provided"><span className="tag-k">type</span><span className="tag-v">{prefs.property_type}</span></span>}
              {prefs.city && <span className="tag provided"><span className="tag-k">ville</span><span className="tag-v">{prefs.city}</span></span>}
              {prefs.price_max && <span className="tag provided"><span className="tag-k">budget max</span><span className="tag-v">{fmt(prefs.price_max)} TND</span></span>}
              {prefs.surface_min && <span className="tag provided"><span className="tag-k">surface min</span><span className="tag-v">{prefs.surface_min} m²</span></span>}
              {prefs.rooms_min && <span className="tag provided"><span className="tag-k">pièces min</span><span className="tag-v">{prefs.rooms_min}</span></span>}
              {prefs.amenities?.map((a) => (
                <span key={a} className="tag default"><span className="tag-v">{AMENITY_LABELS[a] || a}</span></span>
              ))}
              {!prefs.city && <span className="tag default"><span className="tag-v">ville non détectée → Tunis par défaut</span></span>}
            </div>
          </div>
        )}

        {data && results.length === 0 && !error && (
          <div className="card result-empty" style={{ marginTop: '1.5rem' }}>
            <p className="empty-title">Aucune annonce trouvée</p>
            <p className="empty-text">{data.message || 'Essaie une autre ville ou reformule ta demande.'}</p>
          </div>
        )}

        {results.length > 0 && (
          <div className={styles.results}>
            {results.map((r) => (
              <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className={`card ${styles.listingCard}`}>
                <div className={styles.listingHead}>
                  <p className={styles.listingTitle}>{r.title}</p>
                  {r.price != null && <p className={styles.listingPrice}>{fmt(r.price)} <span>TND</span></p>}
                </div>
                <p className={styles.listingLoc}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="14" height="14"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2"/></svg>
                  {r.location || 'Localisation non précisée'}
                </p>
                <div className={styles.listingMeta}>
                  {r.surface != null && <span>{r.surface} m²</span>}
                  {r.rooms != null && <span>{r.rooms} pièces</span>}
                </div>
                {r.matched_amenities?.length > 0 && (
                  <div className="tags">
                    {r.matched_amenities.map((a) => (
                      <span key={a} className="tag provided"><span className="tag-v">{AMENITY_LABELS[a] || a}</span></span>
                    ))}
                  </div>
                )}
                <span className={styles.contactBtn}>
                  Voir l'annonce & le numéro
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17L17 7M17 7H9M17 7V15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </a>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
