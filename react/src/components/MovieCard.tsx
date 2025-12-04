import React, { useState } from 'react'; // useState 임포트
import { Link } from 'react-router-dom';
import TrailerModal from './TrailerModal'; // TrailerModal 임포트
import axios from 'axios'; // TMDB API 호출을 위해 axios 임포트

interface MovieCardProps {
  id: number;
  title: string;
  posterUrl: string;
  isFavorite?: boolean; // isFavorite를 선택적 prop으로 변경
  onToggleFavorite?: (movieId: number, e: React.MouseEvent) => void; // onToggleFavorite를 선택적 prop으로 변경
  size?: 'sm' | 'md' | 'lg'; // 크기 prop 추가 (small, medium, large)
  showTitle?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = ({ id, title, posterUrl, isFavorite, onToggleFavorite, size = 'lg', showTitle = true }) => {
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(id, e);
    }
  };

  const openTrailerModal = () => setIsTrailerModalOpen(true);
  const closeTrailerModal = () => setIsTrailerModalOpen(false);

  const fetchTrailer = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Link 이동 방지

    const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb'; // TMDB API Key
    try {
      const response = await axios.get(`https://api.themoviedb.org/3/movie/${id}/videos?api_key=${apiKey}`);
      const videos = response.data.results;
      const officialTrailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
      
      if (officialTrailer) {
        setTrailerKey(officialTrailer.key);
        openTrailerModal();
      } else if (videos.length > 0) {
        // 공식 트레일러가 없으면 첫 번째 비디오라도 보여줌
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
        
        {/* 찜하기 버튼 (isFavorite prop이 있을 때만 렌더링) */}
        {isFavorite !== undefined && onToggleFavorite && (
          <button
            onClick={handleFavoriteClick}
            className="absolute top-1 right-1 p-1 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75 transition-colors z-10"
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
        )}

        {/* 트레일러 보기 버튼 */}
        <button
          onClick={fetchTrailer}
          className="absolute bottom-1 left-1 p-1 bg-blue-600 bg-opacity-80 rounded-full text-white hover:bg-opacity-100 transition-colors z-10"
          aria-label="트레일러 보기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        </button>

        {showTitle && (
          <div className="py-2 px-0 m-0 flex-grow-0 flex-shrink-0">
            <h4 className="text-center font-semibold text-xs text-gray-800 dark:text-white truncate m-0 p-0" style={{ lineHeight: '1' }}>
              {title}
            </h4>
          </div>
        )}
      </div>

      {isTrailerModalOpen && trailerKey && (
        <TrailerModal trailerKey={trailerKey} onClose={closeTrailerModal} />
      )}
    </Link>
  );
};

export default MovieCard;
