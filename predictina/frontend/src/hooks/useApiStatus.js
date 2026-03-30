import { useState, useEffect } from 'react';
import { checkHealth } from '../api/client';

export function useApiStatus() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'online' | 'offline'

  useEffect(() => {
    checkHealth()
      .then(() => setStatus('online'))
      .catch(() => setStatus('offline'));
  }, []);

  return status;
}
