import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';

// MainPage와 동일한 Movie 타입을 사용합니다.
interface Movie {
  id: number;
  title: string;
  poster_path: string;
}

interface ApiResult {
  results: Movie[];
  page: number;
  total_pages: number;
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q');
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  // useEffect의 의존성 배열에 'query'를 추가합니다.
  // 이렇게 하면 URL의 검색어가 바뀔 때마다 API 호출이 다시 실행됩니다.
  useEffect(() => {
    if (!query) return;

    const fetchMovies = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb&query=${query}&page=${page}`);
        const data = await response.json();
        setMovies(data.results);
        // 페이지 정보도 상태로 관리할 수 있습니다. (여기서는 생략)
      } catch (error) {
        console.error("Failed to fetch search results:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, [query, page]); // 'query' 또는 'page'가 변경될 때마다 이 useEffect가 다시 실행됩니다.

  if (loading) {
    return (
      <div className="p-5 text-center">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">'{query}'에 대한 검색 결과</h1>
        <div className="flex flex-wrap justify-center">
          {/* 스켈레톤 UI를 10개 표시합니다. */}
          {Array.from({ length: 10 }).map((_, index) => (
            <MovieCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 text-center">
      <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">'{query}'에 대한 검색 결과</h1>
      {movies.length > 0 ? (
        <>
          <div className="flex flex-wrap justify-center">
            {movies.map(movie => (
              <MovieCard key={movie.id} id={movie.id} title={movie.title} posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'} />
            ))}
          </div>
          <div className="flex justify-center items-center mt-8 space-x-4">
            <button 
              onClick={() => setSearchParams({ q: query || '', page: String(page - 1) })}
              disabled={page <= 1}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
            >
              이전
            </button>
            <span className="text-lg text-gray-800 dark:text-white">{page}</span>
            <button 
              onClick={() => setSearchParams({ q: query || '', page: String(page + 1) })}
              className="px-4 py-2 bg-blue-500 text-white rounded"
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