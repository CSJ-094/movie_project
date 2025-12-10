import React, { useState, useEffect, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import type { Swiper as SwiperInstance } from 'swiper/types';
import MovieCard from './MovieCard';
import MovieCardSkeleton from './MovieCardSkeleton';
import axios from 'axios';

import 'swiper/css';
import 'swiper/css/free-mode';

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
  }, [fetchUrl, title]);

  useEffect(() => {
    if (fetchUrl) {
      loadMovies(1);
    } else if (initialMovies) {
      setMovies(initialMovies);
      setLoading(initialLoading);
      setHasMore(false);
    }
  }, [fetchUrl, title, initialMovies, initialLoading, loadMovies]);

  const handleReachEnd = () => {
    if (hasMore && !loadingMore && fetchUrl) {
      loadMovies(currentPage + 1);
    }
  };

  const slideNext = () => {
    if (swiper) {
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
      
      <button onClick={slidePrev} className="absolute left-0 top-1/2 -translate-y-1/2 z-30 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75 transition-opacity opacity-0 group-hover:opacity-100 disabled:opacity-0" disabled={swiper?.isBeginning}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>

      <Swiper
        modules={[FreeMode]}
        onSwiper={setSwiper}
        spaceBetween={20}
        slidesPerView={2}
        freeMode={true}
        grabCursor={true}
        onReachEnd={handleReachEnd}
        breakpoints={{
          640: { slidesPerView: 3, spaceBetween: 20 },
          768: { slidesPerView: 4, spaceBetween: 20 },
          1024: { slidesPerView: 5, spaceBetween: 20 },
        }}
        className="movie-section-swiper !overflow-visible py-16"
      >
        {movies.map((movie) => (
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
        {hasMore && fetchUrl && (
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

      <button onClick={slideNext} className="absolute right-0 top-1/2 -translate-y-1/2 z-30 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75 transition-opacity opacity-0 group-hover:opacity-100 disabled:opacity-0" disabled={swiper?.isEnd}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
};

export default MovieSectionCarousel;
