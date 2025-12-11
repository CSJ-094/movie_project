import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface MovieCardProps {
    id: string;
    title: string;
    posterUrl: string;
    isFavorite?: boolean;
    onToggleFavorite?: (movieId: string, e: React.MouseEvent) => void;
    size?: 'sm' | 'md' | 'lg';
    showTitle?: boolean;
    isWatched?: boolean;
    showWatchlistControls?: boolean;
    onToggleWatched?: (movieId: string) => void;
}

const TMDB_API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb';

const MovieCard: React.FC<MovieCardProps> = ({
    id,
    title,
    posterUrl,
    isFavorite,
    onToggleFavorite,
    size = 'md', // [수정] 기본값을 'md'로 변경하여 외부에서 전달된 size prop이 적용되도록 합니다.
    showTitle = true,
    isWatched = false,
    showWatchlistControls = false,
    onToggleWatched,
}) => {
    const [trailerKey, setTrailerKey] = useState<string | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const sizeClass = useMemo(() => {
        switch (size) {
            case 'sm': return 'h-64';
            // [수정] md 사이즈의 높이를 h-[280px]에서 h-[275px]로 추가 미세 조정합니다.
            case 'md': return 'h-[275px]';
            case 'lg':
            default: return 'h-96';
        }
    }, [size]);

    const stopPropagation = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleFavoriteClick = (e: React.MouseEvent) => {
        stopPropagation(e);
        if (onToggleFavorite) {
            onToggleFavorite(id, e);
        }
    };

    const handleWatchlistClick = (e: React.MouseEvent) => {
        stopPropagation(e);
        if (onToggleWatched) {
            onToggleWatched(id);
        }
    };

    const fetchTrailer = async () => {
        try {
            const response = await axios.get(
                `https://api.themoviedb.org/3/movie/${id}/videos?api_key=${TMDB_API_KEY}`
            );
            const videos = response.data.results;
            const officialTrailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');

            if (officialTrailer) {
                setTrailerKey(officialTrailer.key);
            } else if (videos.length > 0) {
                setTrailerKey(videos[0].key);
            }
        } catch (error) {
            console.error("Failed to fetch trailer:", error);
        }
    };

    const handleMouseEnter = () => {
        // [수정] 포스터가 없을 경우(placeholder 이미지 사용 시) 예고편을 불러오지 않음
        if (posterUrl.includes('placeholder')) return;

        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(true);
            fetchTrailer();
        }, 500); // 0.5초 지연
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        setIsHovered(false);
        setTrailerKey(null);
    };

    const cardClasses = `
    relative group no-underline flex-shrink-0
    transition-all duration-300 ease-in-out
    ${isHovered ? 'scale-125 -translate-y-4 shadow-2xl z-20' : 'hover:scale-105 hover:-translate-y-1 hover:shadow-2xl hover:z-10'}
    ${sizeClass} 
    w-[185px]
  `;

    return (
        <div
            className={cardClasses}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <Link to={`/movie/${id}`} className="block w-full h-full">
                <div className="relative border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg h-full flex flex-col">
                    {isHovered && trailerKey ? (
                        <>
                            <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=0&controls=0&loop=1&playlist=${trailerKey}`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full object-cover"
                            ></iframe>
                            {/* Clickable overlay for navigation */}
                            <div className="absolute inset-0 z-10 cursor-pointer"></div>
                        </>
                    ) : (
                        // [수정] 이미지 로딩 실패 시 대체 이미지로 교체하는 onError 핸들러 추가
                        <img
                            src={posterUrl}
                            alt={`${title} 포스터`}
                            className="w-full h-full object-cover block"
                            loading="lazy"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                // 무한 루프 방지: 이미 대체 이미지로 설정된 경우는 다시 시도하지 않음
                                if (!target.src.includes('placeholder')) {
                                    target.src = 'https://placehold.co/200x300?text=No+Image';
                                }
                            }}
                        />
                    )}

                    {isWatched && !isHovered && (
                        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-white text-xl font-bold z-20 transition-opacity">
                            시청 완료
                        </div>
                    )}

                    {isFavorite !== undefined && onToggleFavorite && (
                         <button
                            onClick={handleFavoriteClick}
                            className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-60 rounded-full text-white hover:bg-opacity-80 transition-colors z-30 transform hover:scale-110"
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
                        <button
                            onClick={handleWatchlistClick}
                            className="absolute top-2 left-2 p-1 bg-black bg-opacity-60 rounded-full cursor-pointer hover:bg-opacity-80 z-30 transition-colors"
                            aria-label={isWatched ? '시청 목록에서 제거' : '시청 완료 표시'}
                        >
                            <input
                                type="checkbox"
                                checked={isWatched}
                                readOnly
                                className="h-5 w-5 rounded bg-transparent border-white text-yellow-500 cursor-pointer focus:ring-0"
                            />
                        </button>
                    )}

                    {showTitle && !isHovered && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-2 z-20">
                            <h4 className="text-center font-semibold text-sm text-white truncate">
                                {title}
                            </h4>
                        </div>
                    )}
                </div>
            </Link>
        </div>
    );
};

export default MovieCard;
