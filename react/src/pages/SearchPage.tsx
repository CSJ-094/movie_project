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

  useEffect(() => {
    fetchSearchHistory();
  }, [fetchSearchHistory]);

  useEffect(() => {
    if (!query) {
      setMovies([]);
      setTotalHits(0);
      setLoading(false);
      return;
    }

    const fetchMovies = async () => {
      setLoading(true);
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
      } catch (error) {
        console.error("Failed to fetch search results:", error);
        setMovies([]);
        setTotalHits(0);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, [query, page]);

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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <MovieCardSkeleton key={index} />
          ))}
        </div>
      ) : movies.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-5">
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
              onClick={() => setSearchParams({ q: query || '', page: `${page - 1}` })} // 수정된 부분
              disabled={page <= 1}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
            >
              이전
            </button>
            <span className="text-lg text-gray-800 dark:text-white">{page} / {totalPages || 1}</span>
            <button
              onClick={() => setSearchParams({ q: query || '', page: `${page + 1}` })} // 수정된 부분
              disabled={page >= totalPages}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
            >
              다음
            </button>
          </div>
        </>
      ) : (
        <p className="mt-8 text-gray-800 dark:text-white">검색 결과가 없습니다.</p>
      )}
    </div>
  );
};

export default SearchPage;
