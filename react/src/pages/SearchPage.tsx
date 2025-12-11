import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../contexts/AuthContext';

// 백엔드 API 응답에 맞춘 Movie 인터페이스
interface Movie {
  movieId: string;
  title: string;
  overview: string;
  posterUrl: string | null;
  voteAverage: number;
  releaseDate: string;
  isNowPlaying: boolean;
}

interface SearchResponse {
  totalHits: number;
  page: number;
  size: number;
  movies: Movie[];
}

// SearchHistoryItem 인터페이스 추가
interface SearchHistoryItem {
  id: number;
  query: string;
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const query = searchParams.get('q');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const size = 20;

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalHits, setTotalHits] = useState(0);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]); // 타입 변경
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]); // 제안된 키워드 상태 추가

  // 검색 기록 가져오는 함수
  const fetchSearchHistory = useCallback(async () => {
    if (!isLoggedIn) {
      setSearchHistory([]);
      return;
    }
    try {
      const response = await axiosInstance.get<SearchHistoryItem[]>('/search-history'); // 타입 변경
      setSearchHistory(response.data);
    } catch (error) {
      console.error('검색 기록을 불러오는데 실패했습니다:', error);
      setSearchHistory([]);
    }
  }, [isLoggedIn]);

  // 오타 교정 제안 가져오는 함수
  const fetchSuggestions = useCallback(async (keyword: string) => {
    if (!keyword) {
      setSuggestedKeywords([]);
      return;
    }
    try {
      const response = await axiosInstance.get<string[]>('/movies/suggest', {
        params: { keyword: keyword }
      });
      // 현재 검색어와 다른 제안만 필터링
      const filteredSuggestions = response.data.filter(s => s.toLowerCase() !== keyword.toLowerCase());
      setSuggestedKeywords(filteredSuggestions);
    } catch (error) {
      console.error('오타 교정 제안을 불러오는데 실패했습니다:', error);
      setSuggestedKeywords([]);
    }
  }, []);

  useEffect(() => {
    fetchSearchHistory();
  }, [fetchSearchHistory]);

  useEffect(() => {
    if (!query) {
      setMovies([]);
      setTotalHits(0);
      setLoading(false);
      setSuggestedKeywords([]); // 쿼리가 없으면 제안도 초기화
      return;
    }

    const fetchMovies = async () => {
      setLoading(true);
      setSuggestedKeywords([]); // 새 검색 시작 시 제안 초기화
      try {
        const response = await axiosInstance.get<SearchResponse>('/movies/search', {
          params: {
            keyword: query,
            page: page - 1,
            size: size
          }
        });

        setMovies(response.data.movies);
        setTotalHits(response.data.totalHits);

        // 검색 결과가 없을 경우에만 오타 교정 제안을 가져옵니다.
        if (response.data.totalHits === 0) {
          fetchSuggestions(query);
        }
      } catch (error) {
        console.error("Failed to fetch search results:", error);
        setMovies([]);
        setTotalHits(0);
        fetchSuggestions(query); // 에러 발생 시에도 제안을 가져옵니다.
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, [query, page, fetchSuggestions]); // fetchSuggestions를 의존성 배열에 추가

  // 검색 기록 클릭 시
  const handleSearchHistoryClick = (historyQuery: string) => {
    navigate(`/search?q=${historyQuery}`);
  };

  // 특정 검색 기록 삭제
  const handleDeleteSearchHistoryItem = async (historyId: number, queryToDelete: string) => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (!window.confirm(`'${queryToDelete}' 검색 기록을 삭제하시겠습니까?`)) {
      return;
    }
    try {
      await axiosInstance.delete(`/search-history/${historyId}`);
      fetchSearchHistory(); // 삭제 후 기록 새로고침
      alert('검색 기록이 삭제되었습니다.');
    } catch (error) {
      console.error('검색 기록 삭제 실패:', error);
      alert('검색 기록 삭제에 실패했습니다.');
    }
  };

  // 모든 검색 기록 삭제
  const handleClearSearchHistory = async () => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (!window.confirm('모든 검색 기록을 삭제하시겠습니까?')) {
      return;
    }
    try {
      await axiosInstance.delete('/search-history');
      fetchSearchHistory();
      alert('모든 검색 기록이 삭제되었습니다.');
    } catch (error) {
      console.error('모든 검색 기록 삭제 실패:', error);
      alert('모든 검색 기록 삭제에 실패했습니다.');
    }
  };

  // 제안된 키워드 클릭 시
  const handleSuggestionClick = (suggestion: string) => {
    navigate(`/search?q=${suggestion}`);
  };


  const totalPages = Math.ceil(totalHits / size);

  return (
    <div className="p-5 text-center">
      <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">'{query}'에 대한 검색 결과</h1>

      {isLoggedIn && searchHistory.length > 0 && (
        <div className="mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md text-left">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">최근 검색 기록</h2>
            <button
              onClick={handleClearSearchHistory}
              className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
            >
              전체 삭제
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((item) => ( // item.id를 key로 사용
              <div key={item.id} className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-full px-3 py-1 text-gray-700 dark:text-gray-200 text-sm">
                <span
                  onClick={() => handleSearchHistoryClick(item.query)}
                  className="cursor-pointer hover:underline"
                >
                  {item.query}
                </span>
                <button
                  onClick={() => handleDeleteSearchHistoryItem(item.id, item.query)}
                  className="ml-2 text-gray-500 hover:text-red-500"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 gap-y-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <MovieCardSkeleton key={index} />
          ))}
        </div>
      ) : movies.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 gap-y-4">
            {movies.map(movie => (
              <div key={movie.movieId} className="w-full">
                <MovieCard
                  id={movie.movieId}
                  title={movie.title}
                  posterUrl={movie.posterUrl || 'https://via.placeholder.com/200x300?text=No+Image'}
                  size="sm"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-center items-center mt-8 space-x-4">
            <button
              onClick={() => setSearchParams({ q: query || '', page: `${page - 1}` })}
              disabled={page <= 1}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
            >
              이전
            </button>
            <span className="text-lg text-gray-800 dark:text-white">{page} / {totalPages || 1}</span>
            <button
              onClick={() => setSearchParams({ q: query || '', page: `${page + 1}` })}
              disabled={page >= totalPages}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
            >
              다음
            </button>
          </div>
        </>
      ) : (
        // 검색 결과가 없을 때 제안된 키워드 표시
        <div className="mt-8">
          <p className="text-gray-800 dark:text-white text-xl mb-4">검색 결과가 없습니다.</p>
          {suggestedKeywords.length > 0 && (
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">혹시 다음을 찾으셨나요?</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedKeywords.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
