import { useState } from 'react';

const CITIES = ['Tunis','Sousse','Hammamet','Nabeul','Sfax','Bizerte','Monastir','Kairouan','Gafsa','Gabès','Tataouine'];
const TYPES  = ['apartment', 'house', 'villa'];

const INITIAL = {
  surface: '', rooms: '', bathrooms: '', floor: '',
  total_floors: '', year_built: '',
  parking: false, has_garden: false, has_pool: false,
  location: '', city: '', property_type: '',
};

export default function PropertyForm({ onPredict, loading }) {
  const [form, setForm] = useState(INITIAL);

  const setNum = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setStr = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setBool = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.checked }));

  function buildPayload() {
    const payload = {};
    const numFields = ['surface','rooms','bathrooms','floor','total_floors','year_built'];
    const strFields = ['location','city','property_type'];
    const boolFields = ['parking','has_garden','has_pool'];

    numFields.forEach(k  => { if (form[k] !== '') payload[k] = parseFloat(form[k]); });
    strFields.forEach(k  => { if (form[k] !== '')  payload[k] = form[k]; });
    boolFields.forEach(k => { if (form[k]) payload[k] = true; });
    return payload;
  }

  function handleSubmit() {
    onPredict(buildPayload());
  }

  return (
    <div className="card">
      <p className="card-title">Property Details</p>

      <p className="section-label">Location</p>
      <div className="fields-row">
        <div className="field">
          <label>City</label>
          <select value={form.city} onChange={setStr('city')}>
            <option value="">— auto (most common) —</option>
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Neighbourhood</label>
          <input
            type="text"
            placeholder="e.g. Lac 2, Menzah…"
            value={form.location}
            onChange={setStr('location')}
          />
        </div>
      </div>

      <div className="separator" />
      <p className="section-label">Property</p>
      <div className="fields-row">
        <div className="field">
          <label>Type</label>
          <select value={form.property_type} onChange={setStr('property_type')}>
            <option value="">— auto —</option>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Surface (m²)</label>
          <input type="number" min="10" max="2000" placeholder="median" value={form.surface} onChange={setNum('surface')} />
        </div>
        <div className="field">
          <label>Rooms</label>
          <input type="number" min="1" max="20" placeholder="median" value={form.rooms} onChange={setNum('rooms')} />
        </div>
        <div className="field">
          <label>Bathrooms</label>
          <input type="number" min="1" max="10" placeholder="median" value={form.bathrooms} onChange={setNum('bathrooms')} />
        </div>
        <div className="field">
          <label>Floor</label>
          <input type="number" min="0" max="50" placeholder="median" value={form.floor} onChange={setNum('floor')} />
        </div>
        <div className="field">
          <label>Total Floors</label>
          <input type="number" min="1" max="50" placeholder="median" value={form.total_floors} onChange={setNum('total_floors')} />
        </div>
        <div className="field">
          <label>Year Built</label>
          <input type="number" min="1950" max="2025" placeholder="median" value={form.year_built} onChange={setNum('year_built')} />
        </div>
      </div>

      <div className="separator" />
      <p className="section-label">Amenities</p>
      <div className="bool-row">
        {[['parking','🚗 Parking'],['has_garden','🌿 Garden'],['has_pool','🏊 Pool']].map(([k, label]) => (
          <label key={k} className="bool-item">
            <input type="checkbox" checked={form[k]} onChange={setBool(k)} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <button className="predict-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Estimating…' : 'Estimate Price'}
      </button>
    </div>
  );
}
