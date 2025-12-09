import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import MovieCard from './MovieCard';
import MovieCardSkeleton from './MovieCardSkeleton';
import axios from 'axios'; // axios 임포트

import 'swiper/css';
import 'swiper/css/navigation';

interface MovieSummary {
  id: string;
  title: string;
  poster_path: string;
  watched?: boolean;
}

interface MovieSectionCarouselProps {
  title: string;
  movies?: MovieSummary[]; // movies prop을 선택적으로 변경
  fetchUrl?: string; // fetchUrl prop을 다시 추가
  loading?: boolean;
  onToggleFavorite?: (movieId: string) => void;
  onToggleWatched?: (movieId: string) => void;
  showWatchlistControls?: boolean;
  ratedMovies?: { [movieId: string]: number };
  favoriteMovieIds?: Set<string>; // favoriteMovieIds 추가
  watchlistMovieIds?: Set<string>; // watchlistMovieIds 추가
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
  const [movies, setMovies] = useState<MovieSummary[]>(initialMovies || []);
  const [loading, setLoading] = useState(initialLoading || !!fetchUrl);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // fetchUrl이 제공되면 영화 데이터를 가져옵니다.
    if (fetchUrl) {
      const fetchMovies = async () => {
        setLoading(true);
        setError(null);
        try {
          // TMDB API 키는 환경 변수에서 가져오는 것이 가장 좋습니다.
          const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
          const response = await axios.get(fetchUrl, {
            params: {
              api_key: apiKey,
              language: 'ko-KR',
              page: 1,
            },
          });
          const stringIdMovies = response.data.results.map((movie: any) => ({
            ...movie,
            id: String(movie.id),
          }));
          setMovies(stringIdMovies.slice(0, 10));
        } catch (err) {
          console.error(`Failed to fetch ${title} movies:`, err);
          setError(`'${title}' 영화 정보를 불러오는데 실패했습니다.`);
        } finally {
          setLoading(false);
        }
      };
      fetchMovies();
    } else if (initialMovies) {
      // movies prop이 변경되면 상태를 업데이트합니다.
      setMovies(initialMovies);
      setLoading(initialLoading);
    }
  }, [fetchUrl, title, initialMovies, initialLoading]);

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
    <div className="mb-12">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">{title} ({movies.length})</h2>
      <Swiper
        modules={[Navigation]}
        spaceBetween={20}
        slidesPerView={2}
        navigation
        breakpoints={{
          640: { slidesPerView: 3, spaceBetween: 20 },
          768: { slidesPerView: 4, spaceBetween: 20 },
          1024: { slidesPerView: 5, spaceBetween: 20 },
        }}
        className="movie-section-swiper"
      >
        {movies.map((movie, index) => (
          <SwiperSlide key={movie.id} className="h-auto">
            <MovieCard
              id={movie.id}
              title={movie.title}
              posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'}
              size="md"
              staggerIndex={index}
              isFavorite={favoriteMovieIds.has(movie.id)}
              onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(movie.id) : undefined}
              isWatched={movie.watched ?? watchlistMovieIds.has(movie.id)}
              onToggleWatched={onToggleWatched ? () => onToggleWatched(movie.id) : undefined}
              showWatchlistControls={showWatchlistControls}
              rating={ratedMovies[movie.id]}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default MovieSectionCarousel;
