import { useState } from 'react';
import './index.css';
import './App.css';

import { predict, predictBatch } from './api/client';
import { useApiStatus } from './hooks/useApiStatus';

import Header         from './components/Header';
import ApiStatus      from './components/ApiStatus';
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
    <div className="app-wrapper">
      <Header apiStatus={apiStatus} />
      <main>
        <ApiStatus status={apiStatus} />
        <div className="grid">
          <PropertyForm   onPredict={handlePredict} loading={predLoading} />
          <ResultPanel    result={result} loading={predLoading} error={predError} />
          <CityComparison data={cityData} loading={cityLoading} error={cityError} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
