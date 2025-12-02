import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import MovieCard from '../components/MovieCard';

// 영화 상세 정보에 대한 타입을 정의합니다.
interface MovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genres: { id: number; name: string }[];
}
// 영상 정보에 대한 타입을 추가합니다.
interface Video {
  key: string;
  site: string;
  type: string;
  name: string;
}

// 추천 영화 카드에 사용할 기본 영화 타입
interface RecommendedMovie {
  id: number;
  title: string;
  poster_path: string;
}

// 출연진 정보에 대한 타입을 추가합니다.
interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

const MovieDetailPage: React.FC = () => {
  // 1. useParams를 사용해 URL의 :movieId 값을 가져옵니다.
  const { movieId } = useParams<{ movieId: string }>();
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  // 트레일러 영상의 키를 저장할 state를 추가합니다.
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  // 추천 영화 목록을 저장할 state를 추가합니다.
  const [cast, setCast] = useState<Cast[]>([]);
  const [recommendedMovies, setRecommendedMovies] = useState<RecommendedMovie[]>([]);
  // 캐러셀 컨테이너의 ref를 생성합니다.
  const recommendationsRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!movieId) return;

    const fetchMovieDetails = async () => {
      setLoading(true);
      try {
        // Promise.all을 사용해 상세 정보와 영상 정보를 동시에 요청합니다.
        const [detailsResponse, videosResponse, creditsResponse] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb&language=ko-KR`),
          fetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb`),
          fetch(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb&language=ko-KR`)
        ]);

        const detailsData = await detailsResponse.json();
        const videosData = await videosResponse.json();
        const creditsData = await creditsResponse.json();

        setMovie(detailsData);

        // 응답받은 영상 목록에서 보여줄 영상을 찾습니다. (더 유연한 방식으로)
        // 1. 'Trailer'를 우선적으로 찾습니다.
        // 2. 없다면 'Teaser'를 찾습니다.
        // 3. 그것도 없다면 유튜브 영상 중 첫 번째 것을 선택합니다.
        const officialTrailer = videosData.results.find((video: Video) => video.type === 'Trailer')
          || videosData.results.find((video: Video) => video.type === 'Teaser')
          || videosData.results.find((video: Video) => video.site === 'YouTube');

        if (officialTrailer) {
          setTrailerKey(officialTrailer.key);
        }

        // 출연진 정보를 상태에 저장합니다. (최대 10명)
        if (creditsData.cast) {
          setCast(creditsData.cast.slice(0, 10));
        }

      } catch (error) {
        console.error("Failed to fetch movie details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieDetails();
  }, [movieId]); // movieId가 바뀔 때마다 API를 다시 호출합니다.

  // 영화 상세 정보가 로드되면 추천 영화를 가져오는 useEffect
  useEffect(() => {
    if (!movie || movie.genres.length === 0) return;

    const fetchRecommendations = async () => {
      try {
        // 현재 영화의 장르 ID들을 콤마로 연결한 문자열을 만듭니다.
        const genreIds = movie.genres.map(g => g.id).join(',');
        const response = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb&language=ko-KR&with_genres=${genreIds}&page=1&sort_by=popularity.desc`);
        const data = await response.json();

        // 결과에서 현재 영화는 제외하고, 최대 5개의 영화만 추천 목록으로 설정합니다.
        const recommendations = data.results
          .filter((rec: RecommendedMovie) => rec.id !== movie.id)
          .slice(0, 10);

        setRecommendedMovies(recommendations);
      } catch (error) {
        console.error("Failed to fetch recommended movies:", error);
      }
    };

    fetchRecommendations();
  }, [movie]); // movie 상태가 변경될 때(즉, 상세 정보 로딩이 완료될 때) 실행됩니다.

  const handleBooking = () => {
    alert('예매 기능은 현재 준비 중입니다.');
  };

  // 캐러셀 스크롤 함수
  const scroll = (direction: 'left' | 'right') => {
    if (recommendationsRef.current) {
      // 한 번에 컨테이너의 80%만큼 스크롤합니다.
      const scrollAmount = recommendationsRef.current.clientWidth * 0.8;
      recommendationsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (loading) {
    return <div className="text-center p-12 text-2xl text-gray-800 dark:text-white">상세 정보 로딩 중...</div>;
  }

  if (!movie) {
    return <div className="text-center p-12 text-2xl text-gray-800 dark:text-white">영화 정보를 찾을 수 없습니다.</div>;
  }

  // 3. 받아온 데이터를 사용해 상세 페이지 UI를 그립니다.
  return (
    <div className="text-gray-800 dark:text-white">
      {/* --- 상단 배경 이미지 섹션 --- */}
      <div
        className="relative w-full h-[60vh] bg-cover bg-center"
        style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-60" />
        <div className="relative max-w-5xl mx-auto p-4 md:p-8 h-full flex items-center">
          <div className="flex flex-col md:flex-row items-center md:items-start">
            <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt={movie.title} className="w-48 md:w-64 rounded-lg shadow-2xl z-10" />
            <div className="md:ml-8 mt-5 md:mt-0 text-white text-center md:text-left">
              <h1 className="text-3xl md:text-5xl font-bold">{movie.title}</h1>
              <div className="flex items-center justify-center md:justify-start space-x-4 mt-2">
                <span>⭐ {movie.vote_average.toFixed(1)}</span>
                <span>|</span>
                <span>{movie.release_date}</span>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                {movie.genres.map(g => (
                  <span key={g.id} className="bg-white bg-opacity-20 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">{g.name}</span>
                ))}
              </div>
              <p className="mt-4 text-sm md:text-base max-w-2xl line-clamp-3">{movie.overview}</p>
              <button
                onClick={handleBooking}
                className="mt-6 bg-red-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-red-700 transition-colors text-lg"
              >
                예매하기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- 하단 컨텐츠 섹션 --- */}
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* 주요 출연진 섹션 */}
      {cast.length > 0 && (
        <div className="mt-12">
          <h2 className="text-3xl font-bold mb-4">주요 출연진</h2>
          <div className="flex overflow-x-auto space-x-4 pb-4" style={{ scrollbarWidth: 'thin' }}>
            {cast.map((actor) => (
              <Link to={`/person/${actor.id}`} key={actor.id} className="flex-shrink-0 w-32 text-center no-underline text-current">
                <div>
                  <img
                    src={actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://via.placeholder.com/185x278?text=No+Image'}
                    alt={actor.name}
                    className="w-full h-48 object-cover rounded-lg shadow-md bg-gray-200 dark:bg-gray-700 transform hover:scale-105 transition-transform duration-200"
                  />
                  <p className="mt-2 font-semibold text-sm">{actor.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{actor.character} 역</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 트레일러 영상이 있을 경우에만 보여줍니다. */}
      {trailerKey && (
        <div className="mt-12">
          <h2 className="text-3xl font-bold mb-4">공식 트레일러</h2>
          <div className="relative aspect-w-16 aspect-h-9">
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full rounded-lg shadow-lg"
            ></iframe>
          </div>
        </div>
      )}

      {/* 추천 영화 섹션 */}
      {recommendedMovies.length > 0 && (
        <div className="mt-12">
          <h2 className="text-3xl font-bold mb-4">비슷한 장르의 추천 영화</h2>
          <div className="relative">
            {/* 왼쪽 스크롤 버튼 */}
            <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity">
              &#10094;
            </button>
            {/* 캐러셀 컨테이너 */}
            <div
              ref={recommendationsRef}
              className="flex overflow-x-auto space-x-4 p-2 -m-2 scroll-smooth"
              style={{ scrollbarWidth: 'none', '-ms-overflow-style': 'none' }}
            >
              {recommendedMovies.map(recMovie => (
                // 각 카드가 줄어들지 않도록 flex-shrink-0을 추가합니다.
                <div key={recMovie.id} className="flex-shrink-0">
                  <MovieCard id={recMovie.id} title={recMovie.title} posterUrl={recMovie.poster_path ? `https://image.tmdb.org/t/p/w500${recMovie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'} />
                </div>
              ))}
            </div>
            {/* 오른쪽 스크롤 버튼 */}
            <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity">
              &#10095;
            </button>
          </div>
        </div>
      )}
      </div>

    </div>
  );
};

export default MovieDetailPage;