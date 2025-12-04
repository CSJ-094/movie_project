import React from 'react';
import { Link } from 'react-router-dom';

interface MovieCardProps {
  id: number;
  title: string;
  posterUrl: string;
  isFavorite: boolean;
  onToggleFavorite: (movieId: number, e: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg'; // 크기 prop 추가 (small, medium, large)
  showTitle?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = ({ id, title, posterUrl, isFavorite, onToggleFavorite, size = 'lg', showTitle = true }) => {
  
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite(id, e);
  };

  // size prop에 따라 너비 클래스를 결정합니다.
  const sizeClassName = {
    sm: 'w-40', // small (160px)
    md: 'w-48', // medium (192px)
    lg: 'w-64', // large (256px) - 기본값
  }[size];

  // Link 태그와 내부 div에 동일한 너비 클래스를 적용하여 일관성을 유지합니다.
  const cardContainerClassName = `relative border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-200 h-full flex flex-col ${sizeClassName}`.trim();

  return (
    <Link to={`/movie/${id}`} className={`no-underline m-2 flex-shrink-0 ${sizeClassName}`}>
      <div className={cardContainerClassName}>
        <img 
          src={posterUrl} 
          alt={`${title} poster`} 
          className="w-full h-full object-cover block" // h-full object-cover 추가
        />
        
        <button
          onClick={handleFavoriteClick}
          className="absolute top-1 right-1 p-1 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75 transition-colors"
          aria-label={isFavorite ? '찜 해제' : '찜하기'}
        >
          {isFavorite ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
        </button>

        {showTitle && (
          <div className="py-2 px-0 m-0 flex-grow-0 flex-shrink-0">
            <h4 className="text-center font-semibold text-xs text-gray-800 dark:text-white truncate m-0 p-0" style={{ lineHeight: '1' }}>
              {title}
            </h4>
          </div>
        )}
      </div>
    </Link>
  );
};

export default MovieCard;
