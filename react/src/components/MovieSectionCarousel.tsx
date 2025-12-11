import React, { useState, useEffect, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperInstance } from 'swiper/types';
import MovieCard from './MovieCard';
import MovieCardSkeleton from './MovieCardSkeleton';
import axios from 'axios';
import axiosInstance from '../api/axiosInstance'; // axiosInstance 임포트

import 'swiper/css';
import 'swiper/css/effect-coverflow';

// [제거] JS 로직으로 변경하므로 스타일 주입 코드는 제거합니다.

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
  centered?: boolean; // 중앙 정렬 여부를 위한 prop 추가
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
  centered = true, // 기본값을 true로 설정하여 메인 페이지에 영향 없도록 함
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
      let newMovies: MovieSummary[];
      const isExternalUrl = fetchUrl.startsWith('http');

      if (isExternalUrl) {
        // 기존 TMDB API 호출 로직
        const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
        const response = await axios.get(fetchUrl, {
          params: {
            api_key: apiKey,
            language: 'ko-KR',
            page: page,
          },
        });
        newMovies = response.data.results.map((movie: any) => ({
          ...movie,
          id: String(movie.id),
        }));
      } else {
        // [수정] 백엔드 API 호출 로직
        let response;
        // '찜한 영화' API는 페이징이 없으므로 분기 처리
        if (fetchUrl === '/favorites/details') {
          response = await axiosInstance.get(fetchUrl);
          // 이 API는 페이징이 없으므로 hasMore를 false로 설정
          setHasMore(false);
        } else {
          // [수정] fetchUrl에서 경로와 쿼리 파라미터를 분리하여 axios가 올바르게 처리하도록 합니다.
          const [path, queryString] = fetchUrl.split('?'); // e.g., ['/movies/discover', 'genreId=28']
          const existingParams = new URLSearchParams(queryString || '');
          const finalParams = {
            page: page - 1, // 백엔드는 0-based 페이지
            size: 20,
          };
          // 기존 쿼리 파라미터(예: genreId)를 params 객체에 추가합니다.
          existingParams.forEach((value, key) => {
            (finalParams as any)[key] = value;
          });

          response = await axiosInstance.get(path, { params: finalParams });
        }

        // 백엔드 응답 형식에 맞게 파싱 (SearchPage.tsx 참고)
        // '찜한 영화'는 response.data가 바로 배열, 나머지는 response.data.movies
        const moviesData = Array.isArray(response.data) ? response.data : response.data.movies;
        newMovies = moviesData.map((movie: any) => ({
          // [수정] 찜한 영화 API는 id 필드를 사용하므로 분기 처리
          id: movie.id || movie.movieId,
          title: movie.title,
          poster_path: movie.posterUrl?.replace('https://image.tmdb.org/t/p/w500', '') || '',
        }));
        const totalPages = response.data.totalPages || 1;
      }
      if (newMovies.length === 0) {
        setHasMore(false);
      } else {
        // [수정] '찜한 영화' 목록도 상태에 반영되도록 수정
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
      // loop 모드에서는 onReachEnd가 불안정할 수 있으므로, 버튼 클릭 시 직접 로드
      if (hasMore) loadMoreMovies();
    } else {
      swiper.slideTo(swiper.activeIndex + 7);
    }
  };

  const slidePrev = () => {
    if (swiper) {
      swiper.slideTo(swiper.activeIndex - 7);
    }
  };

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
        }}
        onSlideChange={(s) => {
          setIsBeginning(s.isBeginning);
          setIsEnd(s.isEnd);
        }}
        onReachEnd={loadMoreMovies}
        spaceBetween={20}
        // [수정] slidesPerView를 홀수인 5로 변경하여 중앙 정렬 레이아웃을 안정화합니다.
        slidesPerView={5}
        grabCursor={true}
        centeredSlides={true}
        // [수정] 슬라이드 개수가 충분할 때(10개 초과) loop 모드를 활성화하여
        // 초기 화면에서 왼쪽이 비어 보이는 현상을 방지합니다.
        // loop 모드는 무한 스크롤과 충돌할 수 있으므로, hasMore가 false일 때도 활성화합니다.
        // [수정] loop 경고를 없애기 위해, slidesPerView(7)의 2배인 14개 이상일 때 loop를 활성화합니다.
        loop={movies.length >= 10 || !hasMore}
        // [수정] coverflow 효과를 제거하여 투명도 클래스가 정확히 중앙에 적용되도록 합니다.
        breakpoints={{
          640: { slidesPerView: 1, spaceBetween: 10 },
          768: { slidesPerView: 3, spaceBetween: 15 },
          1024: { slidesPerView: 5, spaceBetween: 20 },
        }}
        watchSlidesProgress={true}
        onProgress={(swiper) => {
          for (let i = 0; i < swiper.slides.length; i++) {
            const slide = swiper.slides[i];
            const progress = (slide as any).progress;
            const absProgress = Math.abs(progress);

            // [로직 수정] 중앙(0)과 양옆(+/-1) 즉, 3개는 선명하게(1) 표시
            // 그 외(>=2)부터는 반투명하게(0.4) 표시
            // 1과 2 사이에서 부드럽게 변하도록 처리
            let opacity = 1;

            if (absProgress <= 1) {
              // 중앙 ~ 양옆 1칸 까지는 완전 불투명
              opacity = 1;
            } else if (absProgress >= 2) {
              // 2칸 이상 떨어지면 반투명
              opacity = 0.4;
            } else {
              // 1.0 < absProgress < 2.0 사이 구간: 1 -> 0.4 로 선형 보간
              // (absProgress - 1) 은 0에서 1로 변함
              opacity = 1 - (absProgress - 1) * 0.6;
            }

            slide.style.opacity = String(opacity);
          }
        }}
        onSetTransition={(swiper, duration) => {
          for (let i = 0; i < swiper.slides.length; i++) {
            swiper.slides[i].style.transitionDuration = `${duration}ms`;
          }
        }}
        className="movie-section-swiper"
      >
        {movies.map((movie) => (
          // [수정] 고정 너비 클래스(!w-48)를 제거하여 MovieCard의 크기가 올바르게 적용될 수 있도록 합니다.
          <SwiperSlide key={movie.id} className="h-auto !w-auto">
            <MovieCard
              id={movie.id}
              title={movie.title}
              // [수정] 포스터가 없을 경우 명시적으로 대체 이미지 URL을 전달합니다.
              posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://placehold.co/200x300?text=No+Image'}
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
          <SwiperSlide className="h-auto !w-auto flex items-center justify-center">
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
