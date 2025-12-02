// c:/dev/work_springboot/movie-frontend/src/pages/MainPage.tsx
import React from 'react';
import useFetch from '../components/useFetch';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';

// API로부터 받아올 영화 데이터의 타입을 정의합니다.
interface Movie {
  id: number;
  title: string;
  poster_path: string;
}

interface ApiResult {
  results: Movie[];
}

const MainPage: React.FC = () => {
  const { data, loading, error } = useFetch<ApiResult>('https://api.themoviedb.org/3/movie/popular?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb');

  if (loading) {
    return (
      <div className="p-5">
        <h1 className="text-3xl font-bold text-center mb-4 text-gray-800 dark:text-white">주간 인기 영화</h1>
        <div className="flex flex-wrap justify-center">
          {Array.from({ length: 10 }).map((_, index) => (
            <MovieCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-12 text-2xl text-red-500">에러가 발생했습니다: {error.message}</div>;
  }

  return (
    <div className="p-5">
      <h1 className="text-3xl font-bold text-center mb-4 text-gray-800 dark:text-white">주간 인기 영화</h1>
      <div className="flex flex-wrap justify-center">
        {data?.results.map(movie => (
          <MovieCard key={movie.id} id={movie.id} title={movie.title} posterUrl={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} />
        ))}
      </div>
    </div>
  );
};

export default MainPage;
