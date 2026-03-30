const fmt = (n) => new Intl.NumberFormat('fr-TN').format(Math.round(n));

export default function ResultPanel({ result, loading, error }) {
  if (loading) {
    return (
      <div className="result-panel">
        <p className="card-title" style={{ marginBottom: 0 }}>Prediction</p>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="result-panel">
        <p className="card-title" style={{ marginBottom: 0 }}>Prediction</p>
        <div className="error-box">❌ {error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="result-panel">
        <p className="card-title" style={{ marginBottom: 0 }}>Prediction</p>
        <div className="result-placeholder">
          Fill in at least one field and click<br />
          <strong>Estimate Price</strong> to get a prediction.<br /><br />
          All fields are optional — missing values are filled with dataset defaults.
        </div>
      </div>
    );
  }

  const { predicted_price_TND: price, input_provided: provided, defaults_applied: defaults } = result;

  return (
    <div className="result-panel">
      <p className="card-title" style={{ marginBottom: 0 }}>Prediction</p>

      <div className="price-display">
        <p className="price-label">Estimated Market Price</p>
        <p className="price-value">
          {fmt(price)} <span className="price-unit">TND</span>
        </p>
        <p className="price-sub">≈ {fmt(price / 3.1)} USD</p>
      </div>

      {Object.keys(provided).length > 0 && (
        <div>
          <p className="result-section-title">✅ Your inputs</p>
          <div className="tags">
            {Object.entries(provided).map(([k, v]) => (
              <span key={k} className="tag provided">{k}: {String(v)}</span>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="result-section-title">🔁 Auto-filled defaults</p>
        <div className="tags">
          {Object.entries(defaults).slice(0, 8).map(([k, v]) => (
            <span key={k} className="tag default">
              {k}: {typeof v === 'number' ? Math.round(v) : String(v)}
            </span>
          ))}
          {Object.keys(defaults).length === 0 && (
            <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>None — all fields provided</span>
          )}
        </div>
      </div>
    </div>
  );
}
