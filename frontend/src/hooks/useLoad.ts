import { DependencyList, useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { errorMessage } from '../api';

export interface LoadState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  refresh: () => void;
}

/**
 * Memuat data dari API setiap layar mendapat fokus (jadi data selalu segar setelah
 * kembali dari layar form). Menyediakan state loading/error/refreshing.
 */
export function useLoad<T>(fetcher: () => Promise<T>, deps: DependencyList = []): LoadState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const hasData = useRef(false);

  const load = useCallback(async () => {
    if (!hasData.current) setLoading(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      hasData.current = true;
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => {
      void load();
    }, [load, ...deps]),
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  return { data, loading, refreshing, error, reload: load, refresh };
}
