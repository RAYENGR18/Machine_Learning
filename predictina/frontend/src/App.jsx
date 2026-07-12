import { useState } from 'react';
import './index.css';
import './App.css';

import { predict, predictBatch } from './api/client';
import { useApiStatus } from './hooks/useApiStatus';

import Header         from './components/Header';
import PropertyForm   from './components/PropertyForm';
import ResultPanel    from './components/ResultPanel';
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

  async function handlePredict(payload) {
    setPredLoading(true);
    setPredError(null);
    setCityLoading(true);
    setCityError(null);

    try {
      const data = await predict(payload);
      setResult(data);
    } catch (e) {
      setPredError(e.message || 'Could not connect to API. Make sure FastAPI is running on port 8000.');
      setResult(null);
      setCityLoading(false);
      setCityData(null);
      return;
    } finally {
      setPredLoading(false);
    }

    try {
      const requests = CITIES.map(city => ({ ...payload, city, location: city }));
      const results  = await predictBatch(requests);
      const sorted   = CITIES
        .map((city, i) => ({ city, price: results[i].predicted_price_TND }))
        .sort((a, b) => b.price - a.price);
      setCityData(sorted);
    } catch {
      setCityError('Could not load city comparison.');
      setCityData(null);
    } finally {
      setCityLoading(false);
    }
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
        <div id="compare">
          <CityComparison data={cityData} loading={cityLoading} error={cityError} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
