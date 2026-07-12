import { useMemo } from 'react';

// Human-readable feature names + value formatting
const FIELD_LABELS = {
  surface:      { label: 'Surface',      fmt: v => `${v} m²` },
  rooms:        { label: 'Rooms',        fmt: v => `${v}` },
  bathrooms:    { label: 'Bathrooms',    fmt: v => `${v}` },
  floor:        { label: 'Floor',        fmt: v => `${v}` },
  total_floors: { label: 'Total floors', fmt: v => `${v}` },
  year_built:   { label: 'Year built',   fmt: v => `${v}` },
  parking:      { label: 'Parking',      fmt: v => v ? 'yes' : 'no' },
  has_garden:   { label: 'Garden',       fmt: v => v ? 'yes' : 'no' },
  has_pool:     { label: 'Pool',         fmt: v => v ? 'yes' : 'no' },
  city:         { label: 'City',         fmt: v => `${v}` },
  location:     { label: 'Neighbourhood',fmt: v => `${v}` },
  property_type:{ label: 'Property type',fmt: v => `${v}` },
};

const fmtTND = (n) => new Intl.NumberFormat('fr-TN').format(Math.round(Math.abs(n)));

export default function PriceBreakdown({ data, loading, error }) {
  const rows = useMemo(() => {
    if (!data || data.length === 0) return [];
    const maxAbs = Math.max(...data.map(d => Math.abs(d.impact))) || 1;
    return data
      .map(d => ({ ...d, pct: (Math.abs(d.impact) / maxAbs) * 100 }))
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }, [data]);

  return (
    <div className="city-compare breakdown-card">
      <div className="card-head">
        <div>
          <p className="card-title">What's driving this price</p>
          <p className="card-subtitle">How each field you entered lifts or lowers the estimate</p>
        </div>
        {!loading && !error && rows.length > 0 && (
          <span className="pill pill-teal">{rows.length} factors</span>
        )}
      </div>

      {loading && (
        <div className="break-loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="break-skel">
              <div className="skeleton skeleton-b-label" />
              <div className="skeleton skeleton-b-bar" />
              <div className="skeleton skeleton-b-val" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="error-box"><span>Could not load price breakdown.</span></div>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="result-placeholder">Enter at least one property field to see what drives the price.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <div className="break-legend">
            <span className="lg lg-up">
              <span className="lg-swatch lg-green" /> Adds value
            </span>
            <span className="lg lg-down">
              <span className="lg-swatch lg-amber" /> Lowers value
            </span>
          </div>

          <div className="break-rows">
            {rows.map(({ feature, userValue, impact, pct }) => {
              const meta = FIELD_LABELS[feature] || { label: feature, fmt: v => String(v) };
              const positive = impact >= 0;
              return (
                <div key={feature} className="break-row">
                  <div className="break-info">
                    <span className={`break-arrow ${positive ? 'arr-up' : 'arr-down'}`} aria-hidden="true">
                      {positive
                        ? <svg viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    <div className="break-meta">
                      <span className="break-feature">{meta.label}</span>
                      <span className="break-value">{meta.fmt(userValue)}</span>
                    </div>
                  </div>

                  <div className="break-track" role="img"
                       aria-label={`${meta.label} ${meta.fmt(userValue)}: ${positive ? 'adds' : 'lowers'} ${fmtTND(impact)} TND`}>
                    <div className="break-axis" />
                    <div
                      className={`break-bar ${positive ? 'bar-add' : 'bar-sub'}`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>

                  <span className={`break-impact ${positive ? 'imp-add' : 'imp-sub'}`}>
                    {positive ? '+' : '−'}{fmtTND(impact)}
                    <span className="imp-unit">TND</span>
                  </span>
                </div>
              );
            })}
          </div>

          <p className="break-footnote">
            Leave-one-out analysis — each bar shows the price change when that field reverts to its dataset default.
          </p>
        </>
      )}
    </div>
  );
}
