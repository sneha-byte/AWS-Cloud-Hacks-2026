import { useState, useEffect } from 'react';
import { TraceLog } from '../types/trace';
import { mockTraceLogs } from '../data/mockTraces';

export function useTracePolling(pollingInterval = 2000, useMockData = true) {
  const [traces, setTraces] = useState<TraceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (useMockData) {
      // Simulate progressive loading of mock data
      let index = 0;
      setLoading(false);

      const interval = setInterval(() => {
        if (index < mockTraceLogs.length) {
          setTraces(prev => [...prev, mockTraceLogs[index]]);
          index++;
        } else {
          clearInterval(interval);
        }
      }, 3000); // Add new trace every 3 seconds

      return () => clearInterval(interval);
    } else {
      // Real API polling
      const fetchTraces = async () => {
        try {
          const response = await fetch('/api/logs');
          if (!response.ok) throw new Error('Failed to fetch traces');
          const data = await response.json();
          setTraces(data);
          setLoading(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      };

      fetchTraces();
      const interval = setInterval(fetchTraces, pollingInterval);

      return () => clearInterval(interval);
    }
  }, [pollingInterval, useMockData]);

  return { traces, loading, error };
}
