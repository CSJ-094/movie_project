// c:/dev/work_springboot/movie-frontend/src/components/MovieCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';

// MovieCard 컴포넌트가 받을 데이터의 타입을 정의합니다. (TypeScript)
interface MovieCardProps {
  id: number;
  title: string;
  posterUrl: string;
}

const MovieCard: React.FC<MovieCardProps> = ({ id, title, posterUrl }) => {
  return (
    // Link 컴포넌트로 전체 카드를 감싸고, to 속성에 상세 페이지 경로를 지정합니다.
    <Link to={`/movie/${id}`} className="no-underline">
      <div className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 m-2 w-48 rounded-lg overflow-hidden shadow-lg cursor-pointer transform hover:scale-105 transition-transform duration-200">
        <img src={posterUrl} alt={`${title} poster`} className="w-full block" />
        <h4 className="p-2 text-center font-semibold text-sm text-gray-800 dark:text-white">{title}</h4>
      </div>
    </Link>
  );
};

export default MovieCard;
