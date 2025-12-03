import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import axiosInstance from '../api/axiosInstance';

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

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q');
  // 프론트엔드 URL은 1-based page, 백엔드는 0-based page
  const page = parseInt(searchParams.get('page') || '1', 10);
  const size = 20; // 페이지 당 항목 수

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalHits, setTotalHits] = useState(0);

  useEffect(() => {
    if (!query) return;

    const fetchMovies = async () => {
      setLoading(true);
      try {
        // 백엔드 API 호출
        const response = await axiosInstance.get<SearchResponse>('/movies/search', {
          params: {
            keyword: query,
            page: page - 1, // 백엔드는 0부터 시작하므로 1을 뺍니다.
            size: size
          }
        });

        setMovies(response.data.movies);
        setTotalHits(response.data.totalHits);
      } catch (error) {
        console.error("Failed to fetch search results:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, [query, page]);

  if (loading) {
    return (
      <div className="p-5 text-center">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">'{query}'에 대한 검색 결과</h1>
        <div className="flex flex-wrap justify-center">
          {Array.from({ length: 10 }).map((_, index) => (
            <MovieCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalHits / size);

  return (
    <div className="p-5 text-center">
      <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">'{query}'에 대한 검색 결과</h1>
      {movies.length > 0 ? (
        <>
          <div className="flex flex-wrap justify-center">
            {movies.map(movie => (
              <MovieCard
                key={movie.movieId}
                id={Number(movie.movieId)}
                title={movie.title}
                posterUrl={movie.posterUrl || 'https://via.placeholder.com/200x300?text=No+Image'}
              />
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
            <span className="text-lg text-gray-800 dark:text-white">{page} / {totalPages || 1}</span>
            <button
              onClick={() => setSearchParams({ q: query || '', page: String(page + 1) })}
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
