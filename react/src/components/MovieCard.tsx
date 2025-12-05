import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TrailerModal from './TrailerModal';
import axios from 'axios';

interface MovieCardProps {
  id: number;
  title: string;
  posterUrl: string;
  isFavorite?: boolean;
  onToggleFavorite?: (movieId: number, e: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
  showTitle?: boolean;
  isWatched?: boolean;
  showWatchlistControls?: boolean;
  onToggleWatched?: (movieId: number) => void;
  staggerIndex?: number;
}

const MovieCard: React.FC<MovieCardProps> = ({ 
  id, 
  title, 
  posterUrl, 
  isFavorite, 
  onToggleFavorite, 
  size = 'lg', 
  showTitle = true, 
  isWatched = false,
  showWatchlistControls = false,
  onToggleWatched,
  staggerIndex = 0
}) => {
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(id, e);
    }
  };

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleWatched) {
      onToggleWatched(id);
    }
  };

  const openTrailerModal = () => setIsTrailerModalOpen(true);
  const closeTrailerModal = () => setIsTrailerModalOpen(false);

  const fetchTrailer = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
    try {
      const response = await axios.get(`https://api.themoviedb.org/3/movie/${id}/videos?api_key=${apiKey}`);
      const videos = response.data.results;
      const officialTrailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
      
      if (officialTrailer) {
        setTrailerKey(officialTrailer.key);
        openTrailerModal();
      } else if (videos.length > 0) {
        setTrailerKey(videos[0].key);
        openTrailerModal();
      } else {
        alert('트레일러를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error("Failed to fetch trailer:", error);
      alert('트레일러를 불러오는 데 실패했습니다.');
    }
  };

  // size에 따라 높이만 정의하도록 변경
  const sizeClassName = {
    sm: 'h-64', // w-40에 맞는 대략적인 높이
    md: 'h-72', // w-48에 맞는 대략적인 높이
    lg: 'h-96', // w-64에 맞는 대략적인 높이
  }[size];

  const cardWrapperClassName = `
    relative group no-underline flex-shrink-0 w-full // w-full 추가, 고정 너비 제거
    ${sizeClassName} // 높이만 적용
    transition-all duration-300 ease-in-out
    hover:scale-105 hover:-translate-y-1 hover:shadow-2xl hover:z-10
  `;

  return (
    <div 
      className={cardWrapperClassName} 
    >
      <Link to={`/movie/${id}`} className="block w-full h-full">
        <div className="relative border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg h-full flex flex-col">
          <img 
            src={posterUrl} 
            alt={`${title} poster`} 
            className="w-full h-full object-cover block" // w-full h-full 유지
          />
          
          {isWatched && (
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center text-white text-xl font-bold z-20">
              시청 완료
            </div>
          )}

          {isFavorite !== undefined && onToggleFavorite && (
            <button
              onClick={handleFavoriteClick}
              className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-60 rounded-full text-white hover:bg-opacity-80 transition-colors z-30"
              aria-label={isFavorite ? '찜 해제' : '찜하기'}
            >
              {isFavorite ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4.5 4.5 0 010-5.656z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
            </button>
          )}

          {showWatchlistControls && onToggleWatched && (
            <div 
              onClick={handleWatchlistClick}
              className="absolute top-2 left-2 p-1.5 bg-black bg-opacity-60 rounded-full cursor-pointer hover:bg-opacity-80 z-30"
            >
              <input
                type="checkbox"
                checked={isWatched}
                readOnly
                className="form-checkbox h-5 w-5 text-yellow-500 rounded bg-transparent border-gray-400 focus:ring-0"
              />
            </div>
          )}

          <button
            onClick={fetchTrailer}
            className="absolute bottom-2 left-2 p-1.5 bg-blue-600 bg-opacity-80 rounded-full text-white hover:bg-opacity-100 transition-colors z-30"
            aria-label="트레일러 보기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </button>

          {showTitle && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 z-20">
              <h4 className="text-center font-semibold text-sm text-white truncate">
                {title}
              </h4>
            </div>
          )}
        </div>
      </Link>

      {isTrailerModalOpen && trailerKey && (
        <TrailerModal trailerKey={trailerKey} onClose={closeTrailerModal} />
      )}
    </div>
  );
};

export default MovieCard;