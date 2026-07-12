const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function checkHealth() {
  const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
  return r.json();
}

export async function predict(payload) {
  const r = await fetch(`${BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function predictBatch(requests) {
  const r = await fetch(`${BASE}/predict/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requests),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function recommend(query) {
  const r = await fetch(`${BASE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
