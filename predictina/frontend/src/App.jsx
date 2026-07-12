import { useState } from 'react';
import './index.css';
import './App.css';

import { predict, predictBatch } from './api/client';
import { useApiStatus } from './hooks/useApiStatus';

import Header         from './components/Header';
import PropertyForm   from './components/PropertyForm';
import ResultPanel    from './components/ResultPanel';
import PriceBreakdown from './components/PriceBreakdown';
import CityComparison from './components/CityComparison';
import Footer         from './components/Footer';

const CITIES = ['Tunis','Sousse','Hammamet','Nabeul','Sfax','Bizerte','Monastir','Kairouan','Gafsa','Gabès','Tataouine'];

export default function App() {
  const apiStatus = useApiStatus();

  const [result,      setResult]      = useState(null);
  const [predLoading, setPredLoading] = useState(false);
  const [predError,   setPredError]   = useState(null);

  const [cityData,    setCityData]    = useState(null);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError,   setCityError]   = useState(null);

  const [breakData,   setBreakData]   = useState(null);
  const [breakLoading,setBreakLoading]= useState(false);
  const [breakError,  setBreakError]  = useState(null);

  async function handlePredict(payload) {
    setPredLoading(true);
    setPredError(null);
    setCityLoading(true);
    setCityError(null);
    setBreakLoading(true);
    setBreakError(null);

    let basePrice;
    try {
      const data = await predict(payload);
      setResult(data);
      basePrice = data.predicted_price_TND;
    } catch (e) {
      setPredError(e.message || 'Could not connect to API. Make sure FastAPI is running on port 8000.');
      setResult(null);
      setCityLoading(false);
      setCityData(null);
      setBreakLoading(false);
      setBreakData(null);
      return;
    } finally {
      setPredLoading(false);
    }

    // Parallel: city comparison + leave-one-out impact breakdown
    const providedFields = Object.keys(payload);

    const cityP = predictBatch(CITIES.map(city => ({ ...payload, city, location: city })))
      .then(results => {
        const sorted = CITIES
          .map((city, i) => ({ city, price: results[i].predicted_price_TND }))
          .sort((a, b) => b.price - a.price);
        setCityData(sorted);
      })
      .catch(() => { setCityError('Could not load city comparison.'); setCityData(null); })
      .finally(() => setCityLoading(false));

    const breakP = (providedFields.length === 0)
      ? Promise.resolve().then(() => { setBreakData(null); setBreakLoading(false); })
      : predictBatch(providedFields.map(field => {
          // counterfactual = payload without this one field
          const cf = { ...payload };
          delete cf[field];
          return cf;
        }))
          .then(results => {
            const rows = providedFields.map((field, i) => ({
              feature: field,
              userValue: payload[field],
              impact: basePrice - results[i].predicted_price_TND,
            }));
            setBreakData(rows);
          })
          .catch(() => { setBreakError('Could not load price breakdown.'); setBreakData(null); })
          .finally(() => setBreakLoading(false));

    await Promise.all([cityP, breakP]);
  }

  return (
    <div className="app-wrapper" id="top">
      <Header apiStatus={apiStatus} />

      <section className="hero">
        <div className="hero-inner">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> ML-powered valuation · Tunisia
          </span>
          <h1 className="hero-title">
            Know what a home is <span className="hl">really worth</span>.
          </h1>
          <p className="hero-sub">
            Predictina turns sparse property details into an instant, data-driven market
            value in TND — then compares the same home across {CITIES.length} Tunisian cities.
          </p>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-num">11</span>
              <span className="stat-label">Cities</span>
            </div>
            <div className="stat-sep" />
            <div className="stat">
              <span className="stat-num">12</span>
              <span className="stat-label">Features</span>
            </div>
            <div className="stat-sep" />
            <div className="stat">
              <span className="stat-num">3</span>
              <span className="stat-label">ML models</span>
            </div>
            <div className="stat-sep" />
            <div className="stat">
              <span className="stat-num">0</span>
              <span className="stat-label">Required fields</span>
            </div>
          </div>
        </div>
      </section>

      <main id="predictor">
        <div className="grid">
          <PropertyForm   onPredict={handlePredict} loading={predLoading} />
          <ResultPanel    result={result} loading={predLoading} error={predError} />
        </div>
        <PriceBreakdown data={breakData} loading={breakLoading} error={breakError} />
        <div id="compare">
          <CityComparison data={cityData} loading={cityLoading} error={cityError} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
