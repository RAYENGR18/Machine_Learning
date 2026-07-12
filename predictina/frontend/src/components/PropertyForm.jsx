import { useState } from 'react';

const CITIES = ['Tunis','Sousse','Hammamet','Nabeul','Sfax','Bizerte','Monastir','Kairouan','Gafsa','Gabès','Tataouine'];
const TYPES  = ['apartment', 'house', 'villa'];

const INITIAL = {
  surface: '', rooms: '', bathrooms: '', floor: '',
  total_floors: '', year_built: '',
  parking: false, has_garden: false, has_pool: false,
  location: '', city: '', property_type: '',
};

const AMENITIES = [
  ['parking',   'Parking'],
  ['has_garden','Garden'],
  ['has_pool',  'Pool'],
];

export default function PropertyForm({ onPredict, loading }) {
  const [form, setForm] = useState(INITIAL);

  const setNum  = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setStr  = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setBool = (k) => () => setForm(f => ({ ...f, [k]: !f[k] }));

  const providedCount = ['surface','rooms','bathrooms','floor','total_floors','year_built','location','city','property_type']
    .filter(k => form[k] !== '' && form[k] !== false).length
    + AMENITIES.filter(([k]) => form[k]).length;

  function buildPayload() {
    const payload = {};
    const numFields  = ['surface','rooms','bathrooms','floor','total_floors','year_built'];
    const strFields  = ['location','city','property_type'];
    const boolFields = ['parking','has_garden','has_pool'];

    numFields.forEach(k  => { if (form[k] !== '') payload[k] = parseFloat(form[k]); });
    strFields.forEach(k  => { if (form[k] !== '')  payload[k] = form[k]; });
    boolFields.forEach(k => { if (form[k]) payload[k] = true; });
    return payload;
  }

  function handleSubmit(e) {
    e.preventDefault();
    onPredict(buildPayload());
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <div className="card-head">
        <p className="card-title">Property Details</p>
        <span className="pill">{providedCount} provided</span>
      </div>

      <fieldset>
        <legend className="section-label">Location</legend>
        <div className="fields-row">
          <label className="field">
            <span className="field-label">City</span>
            <select value={form.city} onChange={setStr('city')}>
              <option value="">Auto (most common)</option>
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Neighbourhood</span>
            <input
              type="text"
              placeholder="e.g. Lac 2, Menzah…"
              value={form.location}
              onChange={setStr('location')}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="section-label">Property</legend>
        <div className="fields-row">
          <label className="field">
            <span className="field-label">Type</span>
            <select value={form.property_type} onChange={setStr('property_type')}>
              <option value="">Auto</option>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Surface (m²)</span>
            <input type="number" min="10" max="2000" placeholder="median" value={form.surface} onChange={setNum('surface')} />
          </label>
          <label className="field">
            <span className="field-label">Rooms</span>
            <input type="number" min="1" max="20" placeholder="median" value={form.rooms} onChange={setNum('rooms')} />
          </label>
          <label className="field">
            <span className="field-label">Bathrooms</span>
            <input type="number" min="1" max="10" placeholder="median" value={form.bathrooms} onChange={setNum('bathrooms')} />
          </label>
          <label className="field">
            <span className="field-label">Floor</span>
            <input type="number" min="0" max="50" placeholder="median" value={form.floor} onChange={setNum('floor')} />
          </label>
          <label className="field">
            <span className="field-label">Total Floors</span>
            <input type="number" min="1" max="50" placeholder="median" value={form.total_floors} onChange={setNum('total_floors')} />
          </label>
          <label className="field">
            <span className="field-label">Year Built</span>
            <input type="number" min="1950" max="2025" placeholder="median" value={form.year_built} onChange={setNum('year_built')} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="section-label">Amenities</legend>
        <div className="chips">
          {AMENITIES.map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`chip ${form[k] ? 'chip-on' : ''}`}
              onClick={setBool(k)}
              aria-pressed={form[k]}
            >
              <span className="chip-check" aria-hidden="true">
                {form[k]
                  ? <svg viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.5"/></svg>}
              </span>
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <button type="submit" className="predict-btn" disabled={loading}>
        {loading ? (
          <><span className="btn-spinner" /> Estimating…</>
        ) : (
          <>
            Estimate Price
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </>
        )}
      </button>
      <p className="form-hint">All fields are optional — missing values are auto-filled from the dataset.</p>
    </form>
  );
}
