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
    size = 'lg',
    showTitle = true,
    isWatched = false,
    showWatchlistControls = false,
    onToggleWatched,
}) => {
    const [trailerKey, setTrailerKey] = useState<string | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const sizeClass = useMemo(() => {
        switch (size) {
            case 'sm': return 'h-64';
            case 'md': return 'h-72';
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
        setIsMuted(true); // 음소거 상태 초기화
    };

    const cardClasses = `
    relative group no-underline flex-shrink-0 w-full
    transition-all duration-300 ease-in-out
    ${isHovered ? 'scale-125 -translate-y-4 shadow-2xl z-20' : 'hover:scale-105 hover:-translate-y-1 hover:shadow-2xl hover:z-10'}
    ${sizeClass}
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
                                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${trailerKey}`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full object-cover"
                            ></iframe>
                            <button
                                onClick={(e) => {
                                    stopPropagation(e);
                                    setIsMuted(!isMuted);
                                }}
                                className="absolute bottom-2 right-2 p-1.5 bg-black bg-opacity-60 rounded-full text-white hover:bg-opacity-80 transition-colors z-30 transform hover:scale-110"
                                aria-label={isMuted ? '음소거 해제' : '음소거'}
                            >
                                {isMuted ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M7 4a1 1 0 000 2v4a1 1 0 102 0V6h1v4a1 1 0 102 0V6h1v4a1 1 0 102 0V6a1 1 0 10-2 0v0H9V6a1 1 0 10-2 0v0H6V4a1 1 0 00-1-1z" />
                                        <path fillRule="evenodd" d="M.458 8.042A.5.5 0 011 8.5v3a.5.5 0 01-.542.458l-2.084-.347a.5.5 0 01-.458-.542V8.39a.5.5 0 01.542-.458l2.084-.348zM16 8.5a.5.5 0 00.542-.458l2.084-.348a.5.5 0 00.458-.542V3.847a.5.5 0 00-.542-.458l-2.084.348a.5.5 0 00-.458.542v4.305z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        </>
                    ) : (
                        <img
                            src={posterUrl}
                            alt={`${title} 포스터`}
                            className="w-full h-full object-cover block"
                            loading="lazy"
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
