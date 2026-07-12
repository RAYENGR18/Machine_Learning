const CITIES = ['Tunis','Sousse','Hammamet','Nabeul','Sfax','Bizerte','Monastir','Kairouan','Gafsa','Gabès','Tataouine'];
const fmt = (n) => new Intl.NumberFormat('fr-TN').format(Math.round(n));

export default function CityComparison({ data, loading, error }) {
  return (
    <div className="city-compare">
      <div className="card-head">
        <div>
          <p className="card-title">City Price Index</p>
          <p className="card-subtitle">Same property profile, compared across {CITIES.length} Tunisian cities</p>
        </div>
        {!loading && !error && data && (
          <span className="pill pill-teal">{data.length} cities</span>
        )}
      </div>

      {loading && (
        <div className="result-loading bars-loading">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="compare-skel">
              <div className="skeleton skeleton-city" />
              <div className="skeleton skeleton-bar" />
              <div className="skeleton skeleton-price-s" />
            </div>
          ))}
        </div>
      )}

      {error && <div className="error-box"><span>Could not load city comparison.</span></div>}

      {!loading && !error && !data && (
        <p className="result-placeholder">Run a prediction to see how the same property prices across Tunisia.</p>
      )}

      {!loading && !error && data && (
        <div className="compare-bar-wrap">
          {data.map(({ city, price }, i) => {
            const maxPrice = Math.max(...data.map(d => d.price));
            const pct = ((price / maxPrice) * 100).toFixed(1);
            const isTop    = i === 0;
            const isBottom = i === data.length - 1;
            return (
              <div key={city} className={`compare-row ${isTop ? 'row-top' : ''}`}>
                <span className={`rank ${isTop ? 'rank-top' : ''} ${isBottom ? 'rank-bottom' : ''}`}>
                  {i + 1}
                </span>
                <span className="compare-city">{city}</span>
                <div className="bar-outer">
                  <div
                    className={`bar-inner ${isTop ? 'bar-top' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                  <span className="bar-pct">{pct}%</span>
                </div>
                <span className="compare-price">
                  <span className="cp-val">{fmt(price)}</span>
                  <span className="cp-unit">TND</span>
                </span>
              </div>
            );
          })}
          <p className="compare-footer">
            Spread: <strong>{fmt(max(data) - min(data))} TND</strong> between most &amp; least expensive city.
          </p>
        </div>
      )}
    </div>
  );
}

function max(arr) { return Math.max(...arr.map(d => d.price)); }
function min(arr) { return Math.min(...arr.map(d => d.price)); }
