import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from '../components/AppHeader';

// 백엔드 API 응답에 맞춘 Movie 인터페이스 (SearchPage.tsx와 동일)
interface Movie {
  movieId: string;
  title: string;
  posterUrl: string | null;
}

interface ApiResponse {
  totalHits: number;
  page: number;
  size: number;
  movies: Movie[];
}

interface MovieListPageProps {
    pageTitle: string;
    fetchUrl: string;
}

const MovieListPage: React.FC<MovieListPageProps> = ({ pageTitle, fetchUrl }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isLoggedIn } = useAuth();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const size = 20;

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalHits, setTotalHits] = useState(0);
  const [favoriteMovieIds, setFavoriteMovieIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get<ApiResponse>(fetchUrl, {
          params: {
            page: page - 1,
            size: size
          }
        });
        setMovies(response.data.movies);
        setTotalHits(response.data.totalHits);
      } catch (error) {
        console.error(`Failed to fetch ${pageTitle} movies:`, error);
        setMovies([]);
        setTotalHits(0);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, [fetchUrl, page, pageTitle]);

  // 찜하기 상태 로드
  useEffect(() => {
    if (isLoggedIn) {
      axiosInstance.get('/user/profile').then(response => {
        setFavoriteMovieIds(new Set(response.data.favoriteMovieIds || []));
      });
    }
  }, [isLoggedIn]);

  const handleToggleFavorite = async (movieId: string) => {
    if (!isLoggedIn) {
        alert('로그인이 필요합니다.');
        return;
    }
    const newFavoriteIds = new Set(favoriteMovieIds);
    if (newFavoriteIds.has(movieId)) {
        newFavoriteIds.delete(movieId);
    } else {
        newFavoriteIds.add(movieId);
    }
    setFavoriteMovieIds(newFavoriteIds);
    try {
        await axiosInstance.post(`/favorites/${movieId}`);
    } catch (err) {
        setFavoriteMovieIds(new Set(favoriteMovieIds)); // 롤백
        alert('찜 상태 변경에 실패했습니다.');
    }
  };

  const totalPages = Math.ceil(totalHits / size);

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      <AppHeader />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">{pageTitle}</h1>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
            {Array.from({ length: 10 }).map((_, index) => (
              <MovieCardSkeleton key={index} size="md" />
            ))}
          </div>
        ) : movies.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
              {movies.map(movie => (
                <MovieCard
                  key={movie.movieId}
                  id={movie.movieId}
                  title={movie.title}
                  posterUrl={movie.posterUrl || 'https://placehold.co/200x300?text=No+Image'}
                  size="md"
                  isFavorite={favoriteMovieIds.has(movie.movieId)}
                  onToggleFavorite={() => handleToggleFavorite(movie.movieId)}
                />
              ))}
            </div>
            <div className="flex justify-center items-center mt-8 space-x-4">
              <button
                onClick={() => setSearchParams({ page: `${page - 1}` })}
                disabled={page <= 1}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
              >
                이전
              </button>
              <span className="text-lg text-gray-800 dark:text-white">{page} / {totalPages || 1}</span>
              <button
                onClick={() => setSearchParams({ page: `${page + 1}` })}
                disabled={page >= totalPages}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
              >
                다음
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">표시할 영화가 없습니다.</p>
        )}
      </div>
    </div>
  );
};

export default MovieListPage;