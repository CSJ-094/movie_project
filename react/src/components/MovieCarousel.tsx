import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { Link } from 'react-router-dom';
import TrailerModal from './TrailerModal'; // TrailerModal 임포트

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
  overview: string; // 추가
  vote_average: number; // 추가
  genre_ids: number[]; // 추가
  release_date: string; // 추가
}

interface Genre {
  id: number;
  name: string;
}

const MovieCarousel: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [genresMap, setGenresMap] = useState<Map<number, string>>(new Map()); // 장르 ID를 이름으로 매핑

  // 장르 목록 가져오기
  useEffect(() => {
    const fetchGenres = async () => {
      const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
      try {
        const response = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=ko-KR`);
        if (!response.ok) throw new Error('Failed to fetch genres from TMDB');
        const data = await response.json();
        const map = new Map<number, string>();
        data.genres.forEach((genre: Genre) => map.set(genre.id, genre.name));
        setGenresMap(map);
      } catch (err) {
        console.error("장르 정보를 불러오는데 실패했습니다.", err);
      }
    };
    fetchGenres();
  }, []);

  useEffect(() => {
    const fetchNowPlayingMovies = async () => {
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
        // 배경 이미지가 있고, overview가 있는 영화만 필터링하고, 상위 5개만 사용합니다.
        const validMovies = data.results.filter((movie: Movie) => movie.backdrop_path && movie.overview).slice(0, 5);
        setMovies(validMovies);
      } catch (error) {
        console.error("Failed to fetch movies for carousel:", error);
        setError("현재 상영작 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchNowPlayingMovies();
  }, []);

  const openTrailerModal = async (movieId: number, e: React.MouseEvent) => {
    e.preventDefault(); // Link 이동 방지
    e.stopPropagation(); // 이벤트 버블링 방지

    const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
    try {
      const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${apiKey}`);
      const data = await response.json();
      const officialTrailer = data.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');

      if (officialTrailer) {
        setTrailerKey(officialTrailer.key);
        setIsTrailerModalOpen(true);
      } else if (data.results.length > 0) {
        setTrailerKey(data.results[0].key); // 첫 번째 비디오라도 보여줌
        setIsTrailerModalOpen(true);
      } else {
        alert('트레일러를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error("Failed to fetch trailer:", error);
      alert('트레일러를 불러오는 데 실패했습니다.');
    }
  };

  const closeTrailerModal = () => {
    setIsTrailerModalOpen(false);
    setTrailerKey(null);
  };

  if (loading) {
    return (
      <div className="w-full h-[70vh] bg-gray-300 dark:bg-gray-700 animate-pulse rounded-lg mb-8"></div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center bg-red-100 text-red-700 rounded-lg mb-8">
        {error}
      </div>
    );
  }

  if (movies.length === 0) {
    return null; // 표시할 영화가 없으면 캐러셀을 렌더링하지 않음
  }

  return (
    <div className="relative w-full h-[70vh] mb-8"> {/* 높이 조정 */}
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={0} // 슬라이드 간 간격 제거
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        loop={true}
        className="w-full h-full rounded-lg"
      >
        {movies.map(movie => (
          <SwiperSlide key={movie.id}>
            <div
              className="relative w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})` }}
            >
              {/* 어두운 그라데이션 오버레이 */}
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent opacity-90" />
              
              <div className="relative z-10 flex items-center h-full max-w-7xl mx-auto px-8">
                <div className="text-white max-w-2xl">
                  <h2 className="text-5xl font-extrabold mb-4 leading-tight">{movie.title}</h2>
                  <p className="text-lg mb-4 line-clamp-3">{movie.overview}</p>
                  <div className="flex items-center text-xl mb-4">
                    <span className="font-bold mr-2">평점:</span>
                    <span className="text-yellow-400">⭐ {movie.vote_average.toFixed(1)}</span>
                    <span className="mx-4">|</span>
                    <span className="font-bold mr-2">장르:</span>
                    <span>
                      {movie.genre_ids.map(id => genresMap.get(id)).filter(Boolean).join(', ')}
                    </span>
                    <span className="mx-4">|</span>
                    <span className="font-bold mr-2">개봉:</span>
                    <span>{movie.release_date.substring(0, 4)}</span>
                  </div>
                  <div className="flex space-x-4 mt-6">
                    <Link
                      to={`/movie/${movie.id}`}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      자세히 보기
                    </Link>
                    <button
                      onClick={(e) => openTrailerModal(movie.id, e)}
                      className="bg-transparent border-2 border-white text-white font-bold py-3 px-6 rounded-lg hover:bg-white hover:text-black transition-colors text-lg flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      트레일러 보기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {isTrailerModalOpen && trailerKey && (
        <TrailerModal trailerKey={trailerKey} onClose={closeTrailerModal} />
      )}
    </div>
  );
};

export default MovieCarousel;