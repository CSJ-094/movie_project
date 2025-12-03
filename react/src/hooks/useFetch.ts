import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance'; // axios 인스턴스 임포트

interface FetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

function useFetch<T>(url: string): FetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // fetch 대신 axiosInstance 사용
        const response = await axiosInstance.get<T>(url);
        setData(response.data);
      } catch (e: any) {
        const error = new Error(e.response?.data || e.message || '데이터를 불러오는 데 실패했습니다.');
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
}

export default useFetch;