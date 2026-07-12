const fmt  = (n) => new Intl.NumberFormat('fr-TN').format(Math.round(n));
const fmtC = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function ResultPanel({ result, loading, error }) {
  if (loading) {
    return (
      <div className="result-panel">
        <p className="card-title">Prediction</p>
        <div className="result-loading">
          <div className="skeleton skeleton-price" />
          <div className="skeleton skeleton-line w70" />
          <div className="skeleton skeleton-line w50" />
          <div className="skeleton skeleton-line w60" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="result-panel">
        <p className="card-title">Prediction</p>
        <div className="error-box">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="result-panel result-empty">
        <div className="empty-icon" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M32 8 L54 26 V52 H42 V38 H22 V52 H10 V26 Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
            <path d="M32 8 V52" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" opacity=".5"/>
          </svg>
        </div>
        <p className="empty-title">Your estimate appears here</p>
        <p className="empty-text">Fill in at least one field and tap <strong>Estimate Price</strong>. Missing values are filled automatically from the dataset.</p>
      </div>
    );
  }

  const { predicted_price_TND: price, input_provided: provided, defaults_applied: defaults } = result;
  const providedCount = Object.keys(provided).length;
  const pricePerM2 = provided.surface ? price / provided.surface : null;

  return (
    <div className="result-panel">
      <p className="card-title">Prediction</p>

      <div className="price-display">
        <div className="price-glow" aria-hidden="true" />
        <p className="price-label">Estimated Market Value</p>
        <p className="price-value">
          {fmt(price)}<span className="price-unit"> TND</span>
        </p>
        <p className="price-sub">≈ {fmtC(price / 3.1)}</p>
        {pricePerM2 && (
          <p className="price-m2">{fmt(pricePerM2)} TND / m²</p>
        )}
      </div>

      <div className="confidence">
        <div className="conf-row">
          <span className="conf-label">Inputs you provided</span>
          <span className="conf-num">{providedCount}</span>
        </div>
        <div className="conf-bar">
          <div className="conf-fill" style={{ width: `${Math.max(12, Math.min(100, providedCount * 11))}%` }} />
        </div>
        <p className="conf-hint">
          {providedCount >= 7 ? 'High-detail estimate — more inputs, tighter prediction.' :
           providedCount >= 3 ? 'Solid estimate with sensible defaults applied.' :
           'Directional estimate — add more details to refine.'}
        </p>
      </div>

      {providedCount > 0 && (
        <div className="result-section">
          <p className="result-section-title provided-title">Your inputs</p>
          <div className="tags">
            {Object.entries(provided).map(([k, v]) => (
              <span key={k} className="tag provided">
                <span className="tag-k">{k}</span>
                <span className="tag-v">{String(v)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {Object.keys(defaults).length > 0 && (
        <div className="result-section">
          <p className="result-section-title defaults-title">Auto-filled defaults</p>
          <div className="tags">
            {Object.entries(defaults).slice(0, 8).map(([k, v]) => (
              <span key={k} className="tag default">
                <span className="tag-k">{k}</span>
                <span className="tag-v">{typeof v === 'number' ? Math.round(v) : String(v)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
