const CITIES = ['Tunis','Sousse','Hammamet','Nabeul','Sfax','Bizerte','Monastir','Kairouan','Gafsa','Gabès','Tataouine'];
const fmt = (n) => new Intl.NumberFormat('fr-TN').format(Math.round(n));

export default function CityComparison({ data, loading, error }) {
  return (
    <div className="city-compare">
      <p className="card-title">City Price Index (same property, median defaults)</p>

      {loading && <div className="spinner" />}

      {error && <p className="error-box">Could not load city comparison.</p>}

      {!loading && !error && !data && (
        <p className="result-placeholder">Run a prediction to see city comparison.</p>
      )}

      {!loading && !error && data && (
        <div className="compare-bar-wrap">
          {data.map(({ city, price }) => {
            const maxPrice = Math.max(...data.map(d => d.price));
            const pct = ((price / maxPrice) * 100).toFixed(1);
            return (
              <div key={city} className="compare-row">
                <span className="compare-city">{city}</span>
                <div className="bar-outer">
                  <div className="bar-inner" style={{ width: `${pct}%` }} />
                </div>
                <span className="compare-price">{fmt(price)} TND</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
