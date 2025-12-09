import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import MovieCard from './MovieCard';
import MovieCardSkeleton from './MovieCardSkeleton';

import 'swiper/css';
import 'swiper/css/navigation';

interface Movie {
  id: string;
  title: string;
  poster_path: string;
}

interface MovieSectionCarouselProps {
  title: string;
  fetchUrl: string;
  favoriteMovieIds: Set<string>;
  onToggleFavorite: (movieId: string, e: React.MouseEvent) => void;
  watchlistMovieIds: Set<string>;
  onToggleWatchlist: (movieId: string) => void;
}

const MovieSectionCarousel: React.FC<MovieSectionCarouselProps> = ({ 
  title, 
  fetchUrl, 
  favoriteMovieIds, 
  onToggleFavorite,
  watchlistMovieIds,
  onToggleWatchlist
}) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      setError(null);
      const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb'; // TMDb API 키
      try {
        const response = await fetch(`${fetchUrl}?api_key=${apiKey}&language=ko-KR&page=1`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        const stringIdMovies = data.results.map((movie: any) => ({ ...movie, id: String(movie.id) }));
        setMovies(stringIdMovies.slice(0, 10)); // 상위 10개 영화만 표시
      } catch (err: any) {
        console.error(`Failed to fetch ${title} movies:`, err);
        setError(`'${title}' 영화 정보를 불러오는데 실패했습니다.`);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [fetchUrl, title]);

  if (error) {
    return (
      <div className="text-center p-4 text-red-500 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">{title}</h2>
      {loading ? (
        <div className="flex space-x-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="w-48 h-72 flex-shrink-0">
              <MovieCardSkeleton size="md" staggerIndex={index} />
            </div>
          ))}
        </div>
      ) : (
        <Swiper
          modules={[Navigation]}
          spaceBetween={20}
          slidesPerView={2}
          navigation
          breakpoints={{
            640: {
              slidesPerView: 3,
              spaceBetween: 20,
            },
            768: {
              slidesPerView: 4,
              spaceBetween: 20,
            },
            1024: {
              slidesPerView: 5,
              spaceBetween: 20,
            },
          }}
          className="movie-section-swiper"
        >
          {movies.map((movie, index) => (
            <SwiperSlide key={movie.id} className="h-72">
              <MovieCard
                id={movie.id}
                title={movie.title}
                posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'}
                size="md"
                staggerIndex={index}
                isFavorite={favoriteMovieIds.has(movie.id)}
                onToggleFavorite={onToggleFavorite}
                isWatched={watchlistMovieIds.has(movie.id)}
                showWatchlistControls={true}
                onToggleWatched={onToggleWatchlist}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  );
};

export default MovieSectionCarousel;
