import { useState } from 'react'
import axios from 'axios'

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function App() {
  const [form, setForm] = useState({ surface: 120, rooms: 3, bathrooms: 2, location: 'Tunis' })
  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [error, setError] = useState('')

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPrediction(null)

    try {
      const payload = {
        surface: Number(form.surface),
        rooms: Number(form.rooms),
        bathrooms: Number(form.bathrooms),
        location: form.location,
      }
      const res = await axios.post(`${apiBase}/predict`, payload)
      setPrediction(res.data.predicted_price)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to fetch prediction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Predictina</h1>
        <p>AI-powered house price prediction dashboard.</p>

        <form onSubmit={onSubmit} className="form-grid">
          <label>
            Surface (m²)
            <input type="number" min="1" value={form.surface} onChange={(e) => onChange('surface', e.target.value)} />
          </label>
          <label>
            Rooms
            <input type="number" min="0" value={form.rooms} onChange={(e) => onChange('rooms', e.target.value)} />
          </label>
          <label>
            Bathrooms
            <input type="number" min="0" value={form.bathrooms} onChange={(e) => onChange('bathrooms', e.target.value)} />
          </label>
          <label>
            Location
            <input type="text" value={form.location} onChange={(e) => onChange('location', e.target.value)} />
          </label>
          <button type="submit" disabled={loading}>{loading ? 'Predicting...' : 'Predict Price'}</button>
        </form>

        {prediction !== null && <div className="result">Predicted price: <strong>{prediction.toLocaleString()} TND</strong></div>}
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  )
}
