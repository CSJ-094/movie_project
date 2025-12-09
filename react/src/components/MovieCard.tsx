import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TrailerModal from './TrailerModal';
import axios from 'axios';
import './MovieCard.css'; // 새로 생성할 CSS 파일 import

interface MovieCardProps {
  id: string;
  title: string;
  posterUrl: string;
  rating?: number;
  genre: string;
  overview: string;
  isFavorite?: boolean;
  onToggleFavorite?: (movieId: string, e: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
  showTitle?: boolean;
  isWatched?: boolean;
  showWatchlistControls?: boolean; // 이 prop을 사용하여 시청 완료 오버레이를 제어합니다.
  onToggleWatched?: (movieId: string) => void;
  staggerIndex?: number;
  className?: string; // Tailwind CSS 클래스를 MovieCard 컴포넌트에 전달하기 위함
}

const MovieCard: React.FC<MovieCardProps> = ({ 
  id, 
  title, 
  posterUrl, 
  rating, 
  genre, 
  overview, 
  isFavorite, 
  onToggleFavorite, 
  size = 'lg', 
  showTitle = true, 
  isWatched = false,
  showWatchlistControls = false, // 기본값을 false로 설정
  onToggleWatched,
  staggerIndex = 0,
  className = '' // 기본값 설정
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

    const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb'; // API 키는 환경 변수로 관리하는 것이 좋습니다.
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

  return (
    <div className={`movie-card ${className}`}> {/* 커스텀 CSS 클래스 적용 및 외부 클래스 병합 */}
      <Link to={`/movie/${id}`} className="card-link"> {/* 전체 카드를 Link로 감싸기 */}
        <div className="card-inner">
          {/* 카드 앞면 */}
          <div className="card-front">
            <img 
              src={posterUrl} 
              alt={`${title} poster`} 
              className="w-full h-full object-cover block rounded-lg" // 이미지 스타일 유지
            />
            {showTitle && ( // 카드 앞면에 제목 오버레이
              <h4 className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 text-center font-semibold text-sm text-white truncate">
                {title}
              </h4>
            )}
            {isWatched && showWatchlistControls && ( // 변경: showWatchlistControls가 true일 때만 표시
              <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center text-white text-xl font-bold z-20">
                시청 완료
              </div>
            )}
          </div>

          {/* 카드 뒷면 */}
          <div className="card-back">
            <h3 className="movie-title-back">{title}</h3>
            <p className="movie-rating-back">⭐ {rating !== undefined ? rating.toFixed(1) : 'N/A'} / 10</p> {/* 평점 표시 */}
            <p className="movie-genre-back">{genre}</p> {/* 장르 표시 */}
            <p className="movie-overview-back">{overview}</p> {/* 줄거리 표시 */}

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

            {/* 뒷면에 자세히 보기 버튼 추가 */}
            <button className="detail-button-back">자세히 보기</button> 
          </div>
        </div>
      </Link>

      {isTrailerModalOpen && trailerKey && (
        <TrailerModal trailerKey={trailerKey} onClose={closeTrailerModal} />
      )}
    </div>
  );
};

export default MovieCard;
