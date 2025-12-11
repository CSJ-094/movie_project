import React, { useState, useEffect, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperInstance } from 'swiper/types';
import MovieCard from './MovieCard';
import MovieCardSkeleton from './MovieCardSkeleton';
import axios from 'axios';

import 'swiper/css';
import 'swiper/css/effect-coverflow';

// [추가] 슬라이드 투명도 효과를 위한 CSS를 동적으로 주입합니다.
// 이렇게 하면 중앙에 위치한 슬라이드를 제외한 나머지 슬라이드들이 반투명하게 보입니다.
const style = document.createElement('style');
// [수정] CSS는 기본 투명도만 정의하고, 선명하게 보일 슬라이드는 JS로 제어합니다.
style.textContent = `
  .movie-section-swiper .swiper-slide {
    opacity: 0.3;
    transition: opacity 0.3s ease;
  }
  .movie-section-swiper .swiper-slide.is-center-visible {
    opacity: 1;
  }
`;
document.head.appendChild(style);

interface MovieSummary {
  id: string;
  title: string;
  poster_path: string;
  watched?: boolean;
}

interface MovieSectionCarouselProps {
  title: string;
  movies?: MovieSummary[];
  fetchUrl?: string;
  loading?: boolean;
  onToggleFavorite?: (movieId: string) => void;
  onToggleWatched?: (movieId: string) => void;
  showWatchlistControls?: boolean;
  ratedMovies?: { [movieId: string]: number };
  favoriteMovieIds?: Set<string>;
  watchlistMovieIds?: Set<string>;
}

const MovieSectionCarousel: React.FC<MovieSectionCarouselProps> = ({
  title,
  movies: initialMovies,
  fetchUrl,
  loading: initialLoading = false,
  onToggleFavorite,
  onToggleWatched,
  showWatchlistControls = false,
  ratedMovies = {},
  favoriteMovieIds = new Set(),
  watchlistMovieIds = new Set(),
}) => {
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  const [movies, setMovies] = useState<MovieSummary[]>(initialMovies || []);
  const [loading, setLoading] = useState(initialLoading || !!fetchUrl);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMovies = useCallback(async (page: number) => {
    if (!fetchUrl) return;

    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
      const response = await axios.get(fetchUrl, {
        params: {
          api_key: apiKey,
          language: 'ko-KR',
          page: page,
        },
      });
      
      const newMovies = response.data.results.map((movie: any) => ({
        ...movie,
        id: String(movie.id),
      }));

      if (newMovies.length === 0) {
        setHasMore(false);
      } else {
        setMovies(prev => page === 1 ? newMovies : [...prev, ...newMovies]);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error(`Failed to fetch ${title} movies:`, err);
      setError(`'${title}' 영화 정보를 불러오는데 실패했습니다.`);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchUrl, title]); // loadingMore 의존성 제거

  const loadMoreMovies = useCallback(() => {
    if (hasMore && !loadingMore) {
      loadMovies(currentPage + 1);
    }
  }, [hasMore, loadingMore, currentPage, loadMovies]);

  useEffect(() => {
    if (fetchUrl) {
      // fetchUrl이 변경될 때 상태를 초기화하고 첫 페이지를 로드합니다.
      setMovies([]);
      setCurrentPage(1);
      setHasMore(true);
      loadMovies(1);
    } else if (initialMovies) {
      setMovies(initialMovies);
      setLoading(initialLoading);
      setHasMore(false);
    }
  }, [fetchUrl, title, initialMovies, initialLoading]); // loadMovies를 의존성 배열에서 제거하여 불필요한 재실행 방지

  const slideNext = () => {
    if (!swiper) return;
    if (isEnd) {
      loadMoreMovies();
    } else {
      swiper.slideTo(swiper.activeIndex + 7);
    }
  };

  const slidePrev = () => {
    if (swiper) {
      swiper.slideTo(swiper.activeIndex - 7);
    }
  };

  // [추가] 슬라이드 변경 시 투명도 제어를 위한 함수
  const updateSlideVisibility = useCallback((swiperInstance: SwiperInstance) => {
    if (!swiperInstance || !swiperInstance.slides) return;

    const activeIndex = swiperInstance.activeIndex;
    const visibleRange = 2; // [수정] 중앙을 기준으로 양옆에 2개씩 (총 5개)

    // 모든 슬라이드에서 클래스 초기화
    swiperInstance.slides.forEach(slide => {
      slide.classList.remove('is-center-visible');
    });

    // 중앙과 양 옆 3개씩, 총 7개 슬라이드에 클래스 추가
    // 중앙과 양 옆 2개씩, 총 5개 슬라이드에 클래스 추가
    for (let i = -visibleRange; i <= visibleRange; i++) {
      const slide = swiperInstance.slides[activeIndex + i];
      if (slide) {
        slide.classList.add('is-center-visible');
      }
    }
  }, []);

  useEffect(() => {
    if (swiper) updateSlideVisibility(swiper);
  }, [movies, swiper, updateSlideVisibility]); // 영화 목록이 변경될 때도 업데이트

  if (loading) {
    return (
      <div className="mb-12">
        <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">{title}</h2>
        <div className="flex space-x-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="w-48 h-72 flex-shrink-0">
              <MovieCardSkeleton size="md" staggerIndex={index} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-500 dark:text-red-400">
        {error}
      </div>
    );
  }
  
  if (!movies || movies.length === 0) {
    return (
      <div className="mb-12">
        <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400">표시할 영화가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="mb-12 relative group">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">{title}</h2>
      
      <button onClick={slidePrev} className="absolute left-0 top-1/2 -translate-y-1/2 z-30 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75 transition-opacity opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:cursor-not-allowed" disabled={isBeginning}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>

      <Swiper
        onSwiper={(s) => {
          setSwiper(s);
          setIsBeginning(s.isBeginning);
          setIsEnd(s.isEnd);
          updateSlideVisibility(s); // 초기 로드 시 투명도 설정
        }}
        onSlideChange={(s) => {
          updateSlideVisibility(s); // 슬라이드 변경 시 투명도 업데이트
          setIsBeginning(s.isBeginning);
          setIsEnd(s.isEnd);
        }}
        onUpdate={updateSlideVisibility} // Swiper가 업데이트될 때 (예: 영화 추가 로딩) 투명도 업데이트
        onReachEnd={loadMoreMovies}
        spaceBetween={20}
        // [수정] slidesPerView를 고정 숫자로 변경하여 표시되는 영화 개수를 제어합니다.
        slidesPerView={7}
        grabCursor={true}
        centeredSlides={true}
        // [수정] 슬라이드 개수가 충분할 때(10개 초과) loop 모드를 활성화하여
        // 초기 화면에서 왼쪽이 비어 보이는 현상을 방지합니다.
        // loop 모드는 무한 스크롤과 충돌할 수 있으므로, hasMore가 false일 때도 활성화합니다.
        loop={movies.length > 10 || !hasMore}
        effect={'coverflow'}
        coverflowEffect={{
          rotate: 5, // 약간의 회전 효과를 주어 입체감을 더합니다.
          stretch: 0,
          depth: 100,
          modifier: 2.5,
          slideShadows: false,
        }}
        breakpoints={{
          640: { spaceBetween: 20 },
          768: { slidesPerView: 5, spaceBetween: 20 },
          1024: { slidesPerView: 7, spaceBetween: 20 },
        }}
        className="movie-section-swiper"
      >
        {movies.map((movie) => (
          // [수정] 고정 너비 클래스(!w-48)를 제거하여 Swiper가 너비를 자동으로 계산하도록 합니다.
          <SwiperSlide key={movie.id} className="h-auto">
            <MovieCard
              id={movie.id}
              title={movie.title}
              posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'}
              size="md"
              isFavorite={favoriteMovieIds.has(movie.id)}
              onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(movie.id) : undefined}
              isWatched={movie.watched ?? watchlistMovieIds.has(movie.id)}
              onToggleWatched={onToggleWatched ? () => onToggleWatched(movie.id) : undefined}
              showWatchlistControls={showWatchlistControls}
            />
          </SwiperSlide>
        ))}
        {(loadingMore) && (
          <SwiperSlide className="h-auto flex items-center justify-center">
            <div className="w-48 h-72 flex items-center justify-center">
                <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
          </SwiperSlide>
        )}
      </Swiper>

      <button onClick={slideNext} className="absolute right-0 top-1/2 -translate-y-1/2 z-30 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75 transition-opacity opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:cursor-not-allowed" disabled={isEnd && !hasMore}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
};

export default MovieSectionCarousel;
