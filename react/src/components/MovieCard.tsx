import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import TrailerModal from './TrailerModal'; // 이 모달 컴포넌트가 존재한다고 가정합니다.
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
    // staggerIndex는 현재 코드에서 사용되지 않으므로 제거하거나, 사용될 경우 주석 처리했습니다.
    // staggerIndex?: number;
}

// TMDB API Key는 환경 변수에서 가져오는 것이 보안상 더 좋습니다.
// 여기서는 원래 코드에 맞춰 하드코딩된 값을 유지합니다.
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
                                                 // staggerIndex = 0 // 현재 사용하지 않음
                                             }) => {
    const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
    const [trailerKey, setTrailerKey] = useState<string | null>(null);

    // 크기에 따른 기본 높이 클래스를 useMemo로 캐싱합니다.
    const sizeClass = useMemo(() => {
        switch (size) {
            case 'sm':
                return 'h-64';
            case 'md':
                return 'h-72';
            case 'lg':
            default:
                return 'h-96';
        }
    }, [size]);

    // 공통 클릭 핸들러: 이벤트 전파 중지
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

    const openTrailerModal = () => setIsTrailerModalOpen(true);
    const closeTrailerModal = () => setIsTrailerModalOpen(false);

    const fetchTrailer = async (e: React.MouseEvent) => {
        stopPropagation(e);

        try {
            const response = await axios.get(
                `https://api.themoviedb.org/3/movie/${id}/videos?api_key=${TMDB_API_KEY}`
            );
            const videos = response.data.results;

            const officialTrailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');

            if (officialTrailer) {
                setTrailerKey(officialTrailer.key);
            } else if (videos.length > 0) {
                // 공식 트레일러가 없으면 첫 번째 비디오를 사용
                setTrailerKey(videos[0].key);
            } else {
                alert('트레일러를 찾을 수 없습니다.');
                return; // 트레일러를 찾지 못했으면 모달을 열지 않습니다.
            }
            openTrailerModal();

        } catch (error) {
            console.error("Failed to fetch trailer:", error);
            alert('트레일러를 불러오는 데 실패했습니다.');
        }
    };

    // 카드 Wrapper의 최종 클래스를 정의
    const cardClasses = `
    relative group no-underline flex-shrink-0 w-full
    transition-all duration-300 ease-in-out
    hover:scale-105 hover:-translate-y-1 hover:shadow-2xl hover:z-10
    ${sizeClass}
  `;

    return (
        <div className={cardClasses}>
            <Link to={`/movie/${id}`} className="block w-full h-full">
                <div className="relative border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg h-full flex flex-col">
                    {/* 포스터 이미지 */}
                    <img
                        src={posterUrl}
                        alt={`${title} 포스터`} // 접근성을 위해 alt 텍스트 수정
                        className="w-full h-full object-cover block"
                        // 로딩 최적화를 위해 loading="lazy" 추가 가능
                        loading="lazy"
                    />

                    {/* 시청 완료 오버레이 */}
                    {isWatched && (
                        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-white text-xl font-bold z-20 transition-opacity">
                            시청 완료
                        </div>
                    )}

                    {/* 찜하기/찜 해제 버튼 */}
                    {isFavorite !== undefined && onToggleFavorite && (
                        <button
                            onClick={handleFavoriteClick}
                            className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-60 rounded-full text-white hover:bg-opacity-80 transition-colors z-30 transform hover:scale-110"
                            aria-label={isFavorite ? '찜 해제' : '찜하기'}
                        >
                            {isFavorite ? (
                                // 찜 완료 아이콘 (Heart filled)
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4.5 4.5 0 010-5.656z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                // 찜 미완료 아이콘 (Heart outline)
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            )}
                        </button>
                    )}

                    {/* 시청 여부 체크박스 (Watchlist Controls) */}
                    {showWatchlistControls && onToggleWatched && (
                        <button
                            onClick={handleWatchlistClick}
                            className="absolute top-2 left-2 p-1 bg-black bg-opacity-60 rounded-full cursor-pointer hover:bg-opacity-80 z-30 transition-colors"
                            aria-label={isWatched ? '시청 목록에서 제거' : '시청 완료 표시'}
                        >
                            <input
                                type="checkbox"
                                checked={isWatched}
                                readOnly // React 경고를 피하기 위해 readOnly
                                // 커스텀 스타일링을 위해 form-checkbox 대신 직접 스타일링 (Tailwind 기본 설정에 따라)
                                className="h-5 w-5 rounded bg-transparent border-white text-yellow-500 cursor-pointer focus:ring-0"
                            />
                        </button>
                    )}

                    {/* 트레일러 보기 버튼 */}
                    <button
                        onClick={fetchTrailer}
                        className="absolute bottom-2 left-2 p-1.5 bg-blue-600 bg-opacity-80 rounded-full text-white hover:bg-opacity-100 transition-colors z-30 transform hover:scale-110"
                        aria-label="트레일러 보기"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                    </button>

                    {/* 영화 제목 오버레이 */}
                    {showTitle && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-2 z-20">
                            <h4 className="text-center font-semibold text-sm text-white truncate">
                                {title}
                            </h4>
                        </div>
                    )}
                </div>
            </Link>

            {/* 트레일러 모달 */}
            {isTrailerModalOpen && trailerKey && (
                <TrailerModal trailerKey={trailerKey} onClose={closeTrailerModal} />
            )}
        </div>
    );
};

export default MovieCard;