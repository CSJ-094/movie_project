import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { Link } from 'react-router-dom';

// Swiper의 CSS를 import합니다.
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// API로부터 받아올 영화 데이터의 타입을 정의합니다.
interface Movie {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path: string;
}

const MovieCarousel: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopRatedMovies = async () => {
      setLoading(true);
      setError(null);
      const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb'; // TMDb API 키
      const apiUrl = `https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}&language=ko-KR&page=1`;

      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        // 배경 이미지가 있는 영화만 필터링하고, 상위 10개만 사용합니다.
        const validMovies = data.results.filter((movie: Movie) => movie.backdrop_path);
        setMovies(validMovies.slice(0, 10));
      } catch (error) {
        console.error("Failed to fetch movies for carousel:", error);
        setError("현재 상영작 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchTopRatedMovies();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-96 bg-gray-300 dark:bg-gray-700 animate-pulse rounded-lg mb-8"></div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-red-100 text-red-700 rounded-lg mb-8">
        {error}
      </div>
    );
  }

  if (movies.length === 0) {
    return null; // 표시할 영화가 없으면 캐러셀을 렌더링하지 않음
  }

  return (
    <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">현재 상영작</h2>
        <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={30}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            loop={true}
            className="rounded-lg"
        >
            {movies.map(movie => (
                <SwiperSlide key={movie.id}>
                    <Link to={`/movie/${movie.id}`}>
                        <div className="relative w-full h-96">
                            <img 
                                src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`} 
                                alt={movie.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-end p-8">
                                <h3 className="text-white text-3xl font-bold">{movie.title}</h3>
                            </div>
                        </div>
                    </Link>
                </SwiperSlide>
            ))}
        </Swiper>
    </div>
  );
};

export default MovieCarousel;
