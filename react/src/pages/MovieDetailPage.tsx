import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

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
  is_now_playing : boolean;
  ott_providers: string[];
  ott_link: string;

  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
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
// 컬렉션 정보에 대한 타입을 추가합니다.
interface Collection {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: RecommendedMovie[];
}

// --- 상단 카테고리 헤더 컴포넌트 ---
const AppHeader: React.FC = () => {
  const location = useLocation();
  const categories = [
    { name: '현재 상영중', path: '/' },
    { name: '인기 영화', path: '/popular' },
    { name: '높은 평점', path: '/top-rated' },
    { name: '개봉 예정', path: '/upcoming' },
  ];

  return (
      <header className="bg-gray-900 bg-opacity-80 backdrop-blur-sm text-white shadow-lg sticky top-0 z-40">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            <div className="flex items-baseline space-x-4">
              {categories.map((category) => (
                  <Link
                      key={category.name}
                      to={category.path}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-300 ${location.pathname === category.path
                          ? 'bg-red-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                  >{category.name}</Link>
              ))}
            </div>
          </div>
        </nav>
      </header>
  );
};

// 스켈레톤 UI 컴포넌트
const MovieDetailSkeleton: React.FC = () => {
  return (
      <div className="animate-pulse">
        {/* --- 상단 스켈레톤 --- */}
        <div className="relative w-full h-[60vh] bg-gray-300 dark:bg-gray-700">
          <div className="relative max-w-5xl mx-auto p-4 md:p-8 h-full flex items-center">
            <div className="flex flex-col md:flex-row items-center md:items-start">
              <div className="w-48 md:w-64 h-72 md:h-96 bg-gray-400 dark:bg-gray-600 rounded-lg shadow-2xl z-10" />
              <div className="md:ml-8 mt-5 md:mt-0 flex-1 w-full">
                <div className="h-10 bg-gray-400 dark:bg-gray-600 rounded w-3/4" />
                <div className="flex items-center space-x-4 mt-4">
                  <div className="h-5 bg-gray-400 dark:bg-gray-600 rounded w-20" />
                  <div className="h-5 bg-gray-400 dark:bg-gray-600 rounded w-24" />
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <div className="h-6 w-20 bg-gray-400 dark:bg-gray-600 rounded-full" />
                  <div className="h-6 w-24 bg-gray-400 dark:bg-gray-600 rounded-full" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-4 bg-gray-400 dark:bg-gray-600 rounded w-full" />
                  <div className="h-4 bg-gray-400 dark:bg-gray-600 rounded w-full" />
                  <div className="h-4 bg-gray-400 dark:bg-gray-600 rounded w-5/6" />
                </div>
                <div className="mt-6 h-14 w-36 bg-gray-400 dark:bg-gray-600 rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* --- 하단 컨텐츠 스켈레톤 --- */}
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          {/* 출연진 스켈레톤 */}
          <div className="mt-12">
            <div className="h-8 w-48 bg-gray-300 dark:bg-gray-700 rounded mb-4" />
            <div className="flex overflow-x-auto space-x-4 pb-4">
              {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex-shrink-0 w-32 text-center">
                    <div className="w-full h-48 bg-gray-300 dark:bg-gray-700 rounded-lg" />
                    <div className="mt-2 h-4 w-24 mx-auto bg-gray-300 dark:bg-gray-700 rounded" />
                    <div className="mt-1 h-3 w-16 mx-auto bg-gray-300 dark:bg-gray-700 rounded" />
                  </div>
              ))}
            </div>
          </div>

          {/* 트레일러 스켈레톤 */}
          <div className="mt-12">
            <div className="h-8 w-48 bg-gray-300 dark:bg-gray-700 rounded mb-4" />
            <div className="aspect-w-16 aspect-h-9 bg-gray-300 dark:bg-gray-700 rounded-lg" />
          </div>

          {/* 추천 영화 스켈레톤 */}
          <div className="mt-12">
            <div className="h-8 w-64 bg-gray-300 dark:bg-gray-700 rounded mb-4" />
            <div className="flex space-x-4">
              {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="w-40 h-60 bg-gray-300 dark:bg-gray-700 rounded-lg flex-shrink-0" />
              ))}
            </div>
          </div>
        </div>
      </div>
  );
};

const MovieDetailPage: React.FC = () => {
  // 1. useParams를 사용해 URL의 :movieId 값을 가져옵니다.
  const { movieId } = useParams<{ movieId: string }>();
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  // 트레일러 영상의 키를 저장할 state를 추가합니다.
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  // 추천 영화 목록을 저장할 state를 추가합니다.
  const [cast, setCast] = useState<Cast[]>([]);
  // 컬렉션 정보를 저장할 state를 추가합니다.
  const [collection, setCollection] = useState<Collection | null>(null);
  const [recommendedMovies, setRecommendedMovies] = useState<RecommendedMovie[]>([]);
  // 캐러셀 컨테이너의 ref를 생성합니다.
  const recommendationsRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  // AuthContext에서 로그인 상태를 가져옵니다.
  const { isLoggedIn } = useAuth();
  // 트레일러 모달의 열림/닫힘 상태를 관리합니다.
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  // 줄거리 '더보기' 상태를 관리합니다.
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  // 줄거리가 실제로 잘렸는지 여부를 저장합니다.
  const [isClamped, setIsClamped] = useState(false);
  // 줄거리 p 태그에 대한 ref
  const overviewRef = useRef<HTMLParagraphElement>(null);
  // 즐겨찾기 상태
  const [isFavorite, setIsFavorite] = useState(false);
  // 관심 목록 상태
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  useEffect(() => {
    if (!movieId) return;

    const fetchMovieDetails = async () => {
      setLoading(true);
      try {
        // Promise.all을 사용해 TMDB에서 상세 정보와 영상 정보를 동시에 요청합니다.
        const [detailsResponse, videosResponse, creditsResponse] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb&language=ko-KR`),
          fetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb`),
          fetch(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb&language=ko-KR`)
        ]);

        const detailsData = await detailsResponse.json();
        const videosData = await videosResponse.json();
        const creditsData = await creditsResponse.json();

        //내 ElasticSearch에서 OTT 정보 가져오기.
        try {
          const backendResponse = await axios.get(`http://localhost:8484/api/movies/${movieId}`);
          const myData = backendResponse.data;

          if(myData){
            detailsData.ott_providers = myData.ott_providers;
            detailsData.ott_link = myData.ott_link;
            detailsData.is_now_playing = myData.is_now_playing;
          }
        }catch (error){
          console.warn("no data")
        }

        setMovie({ ...detailsData });

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

  // 영화 상세 정보가 로드되면, 컬렉션 정보를 가져오는 useEffect
  useEffect(() => {
    if (!movie?.belongs_to_collection) {
      setCollection(null); // 현재 영화가 컬렉션에 속하지 않으면 상태를 초기화합니다.
      return;
    }

    const fetchCollectionDetails = async () => {
      try {
        const response = await fetch(`https://api.themoviedb.org/3/collection/${movie.belongs_to_collection.id}?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb&language=ko-KR`);
        const data = await response.json();
        setCollection(data);
      } catch (error) {
        console.error("Failed to fetch collection details:", error);
      }
    };

    fetchCollectionDetails();
  }, [movie]); // movie 상태가 변경될 때 실행됩니다.

  // 줄거리가 3줄을 넘어가는지 확인하여 '더보기' 버튼 표시 여부를 결정합니다.
  useEffect(() => {
    if (overviewRef.current) {
      // scrollHeight가 clientHeight보다 크면 텍스트가 잘렸다는 의미입니다.
      setIsClamped(overviewRef.current.scrollHeight > overviewRef.current.clientHeight);
    }
  }, [movie?.overview]); // 영화 줄거리가 변경될 때마다 체크

  // movieId가 변경될 때 localStorage를 확인하여 즐겨찾기/관심목록 상태를 설정합니다.
  useEffect(() => {
    if (!movieId) return;
    const numericMovieId = Number(movieId);

    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]') as number[];
    setIsFavorite(favorites.includes(numericMovieId));

    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]') as number[];
    setIsInWatchlist(watchlist.includes(numericMovieId));
  }, [movieId]);

  // 즐겨찾기 토글 함수
  const toggleFavorite = () => {
    // 로그인 상태가 아닐 경우, 알림을 띄우고 함수를 종료합니다.
    if (!isLoggedIn) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }

    if (!movieId) return;
    const numericMovieId = Number(movieId);
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]') as number[];
    let newFavorites: number[];

    if (favorites.includes(numericMovieId)) {
      newFavorites = favorites.filter(id => id !== numericMovieId);
    } else {
      newFavorites = [...favorites, numericMovieId];
    }

    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
  };

  // 관심 목록 토글 함수
  const toggleWatchlist = () => {
    // 로그인 상태가 아닐 경우, 알림을 띄우고 함수를 종료합니다.
    if (!isLoggedIn) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }

    if (!movieId) return;
    const numericMovieId = Number(movieId);
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]') as number[];
    let newWatchlist: number[];

    if (watchlist.includes(numericMovieId)) {
      newWatchlist = watchlist.filter(id => id !== numericMovieId);
    } else {
      newWatchlist = [...watchlist, numericMovieId];
    }

    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
    setIsInWatchlist(!isInWatchlist);
  };

  // 줄거리 더보기/접기 토글 함수
  const toggleOverview = () => setIsOverviewExpanded(!isOverviewExpanded);

  const handleBooking = () => {
    if (isLoggedIn) {
      // TODO: 실제 예매 페이지나 예매 로직으로 연결
      alert('예매 페이지로 이동합니다. (구현 필요)');
    } else {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/login'); // 로그인 페이지로 이동
    }
  };

  // 트레일러 모달을 여는 함수
  const openTrailerModal = () => setIsTrailerModalOpen(true);

  // 트레일러 모달을 닫는 함수
  const closeTrailerModal = () => setIsTrailerModalOpen(false);

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

  const getOttSearchLink = (providerName: string, movieTitle: string) => {
    const titleEncoded = encodeURIComponent(movieTitle);
    const pName = providerName.toLowerCase();

    if (pName.includes('netflix')) return `https://www.netflix.com/`;
    if (pName.includes('disney')) return `https://www.disneyplus.com/`;
    if (pName.includes('wavve')) return `https://www.wavve.com/search?searchWord=${titleEncoded}`;
    if (pName.includes('watcha')) return `https://watcha.com/search?query=${titleEncoded}`;
    if (pName.includes('tving')) return `https://www.tving.com/`;
    if (pName.includes('coupang')) return `https://www.coupangplay.com/search?q=${titleEncoded}`;
    if (pName.includes('apple')) return `https://tv.apple.com/kr/search?term=${titleEncoded}`;

    // 그 외는 구글 검색으로 연결
    return `https://www.google.com/search?q=${titleEncoded} ${providerName}`;
  };

  const getProviderLogoUrl = (providerName: string) => {
    const lowerName = providerName.toLowerCase();
      if (lowerName.includes('netflix')) return 'https://image.tmdb.org/t/p/original/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg';
      if (lowerName.includes('disney')) return 'https://image.tmdb.org/t/p/original/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg';
      if (lowerName.includes('watcha')) return 'https://image.tmdb.org/t/p/original/5qeRb2pQn5877y98t3tE5uEae5.jpg';
      if (lowerName.includes('wavve')) return 'https://media.themoviedb.org/t/p/original/hPcjSaWfMwEqXaCMu7Fkb529Dkc.jpg';
      if (lowerName.includes('apple')) return 'https://image.tmdb.org/t/p/original/q6tl6Ib6X5FT80RMlcDbexIo4St.jpg';
      if (lowerName.includes('tving')) return 'https://media.themoviedb.org/t/p/original/qHThQdkJuROK0k5QTCrknaNukWe.jpg';

  }

  if (loading) {
    return <MovieDetailSkeleton />;
  }

  if (!movie) {
    return <div className="text-center p-12 text-2xl text-gray-800 dark:text-white">영화 정보를 찾을 수 없습니다.</div>;
  }

  // 3. 받아온 데이터를 사용해 상세 페이지 UI를 그립니다.
  return (
      <div className="bg-white dark:bg-gray-900">
        <AppHeader />
        {/* --- 상단 정보 섹션 --- */}
        <div
            className="relative w-full h-[60vh] bg-cover bg-center"
            style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})` }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-60" />
          <div className="relative max-w-5xl mx-auto p-4 md:p-8 h-full flex items-center">
            <div className="flex flex-col md:flex-row items-center md:items-start">
              <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt={movie.title} className="w-48 md:w-64 rounded-lg shadow-2xl z-10" />
              <div className="md:ml-8 mt-5 md:mt-0 text-white text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-x-4">
                  <h1 className="text-3xl md:text-5xl font-bold">{movie.title}</h1>
                  <div className="flex items-center gap-x-2">
                    {/* 즐겨찾기 버튼 */}
                    <button onClick={toggleFavorite} className="p-2 rounded-full bg-black bg-opacity-30 hover:bg-opacity-50 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isFavorite ? 'text-red-500' : 'text-white'}`} fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                      </svg>
                    </button>
                    {/* 관심 목록 버튼 */}
                    <button onClick={toggleWatchlist} className="p-2 rounded-full bg-black bg-opacity-30 hover:bg-opacity-50 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isInWatchlist ? 'text-yellow-400' : 'text-white'}`} fill={isInWatchlist ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center md:justify-start space-x-4 mt-2">
                  <span>⭐ {movie.vote_average.toFixed(1)}</span>
                  <span>|</span>
                  <span>{movie.release_date}</span>
                </div>
                {/* 장르 표시를 점(·)으로 구분하여 한 줄로 간결하게 표시합니다. */}
                <div className="flex items-center justify-center md:justify-start gap-x-2 mt-3 text-gray-300 text-sm">
                  {movie.genres.map((g, index) => (
                      <React.Fragment key={g.id}>
                        <span>{g.name}</span>
                        {/* 마지막 장르가 아닐 경우에만 구분점을 추가합니다. */}
                        {index < movie.genres.length - 1 && <span>·</span>}
                      </React.Fragment>
                  ))}
                </div>
                <div className="mt-4 max-w-2xl">
                  <p
                      ref={overviewRef}
                      className={`text-sm md:text-base transition-all duration-300 ${!isOverviewExpanded && 'line-clamp-3'}`}
                  >
                    {movie.overview}
                  </p>
                  {isClamped && (
                      <button onClick={toggleOverview} className="text-gray-300 hover:text-white font-semibold mt-1">
                        {isOverviewExpanded ? '접기' : '더보기'}
                      </button>
                  )}
                </div>

                <div className="mt-8 flex items-center justify-center md:justify-start space-x-4">

                  <button
                      onClick={handleBooking}
                      disabled={!movie.is_now_playing} // 상영 중이 아니면 버튼 기능 비활성화
                      className={`font-bold py-3 px-8 rounded-lg text-lg transition-colors ${
                          movie.is_now_playing
                              ? 'bg-red-600 text-white hover:bg-red-700' //true
                              : 'bg-red-400 text-gray-300 cursor-not-allowed' //false
                      }`}
                  >
                    {movie.is_now_playing ? '예매 하기' : '예매 불가'}
                  </button>

                  {trailerKey && (
                      <button
                          onClick={openTrailerModal}
                          className="bg-transparent border-2 border-white text-white font-bold py-3 px-6 rounded-lg hover:bg-white hover:text-black transition-colors text-lg"
                      >
                        트레일러 보기
                      </button>
                  )}
                  {movie.ott_providers && movie.ott_providers.length > 0 && (

                      <div className="relative group">

                        <button className="bg-gray-800 border border-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2 text-lg">
                          <span>▶</span> 시청하기
                        </button>
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 transform origin-top-left">
                          <div className="py-2">
                            {movie.ott_providers.map((provider, index) => {
                              const logoUrl = getProviderLogoUrl(provider); // 로고 URL 가져오기

                              return (
                                  <a
                                      key={index}
                                      href={getOttSearchLink(provider, movie.title)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                                  >
                                    {/* 로고 이미지가 있으면 렌더링, 없으면 빈 원으로 표시하거나 생략 */}
                                    {logoUrl ? (
                                        <img
                                            src={logoUrl}
                                            alt={provider}
                                            className="w-6 h-6 rounded-md mr-3 object-cover shadow-sm border border-gray-200 dark:border-gray-600"
                                        />
                                    ) : (
                                        <span className="w-6 h-6 rounded-md mr-3 bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-500">
                                          {provider.charAt(0)}
          </span>
                                    )}

                                    {/* OTT 이름 표시 */}
                                    <span className="font-medium">{provider}</span>
                                  </a>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                  )}
                </div>
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

          {/* 컬렉션/시리즈 정보 섹션 */}
          {collection && (
              <div className="mt-12">
                <div
                    className="relative rounded-xl p-8 bg-cover bg-center text-white"
                    style={{
                      backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(https://image.tmdb.org/t/p/w1280${collection.backdrop_path})`
                    }}
                >
                  <h2 className="text-3xl font-bold mb-2">'{collection.name}'의 일부입니다</h2>
                  <p className="text-lg mb-6">이 컬렉션에 포함된 다른 영화들도 확인해보세요.</p>
                  <div className="flex overflow-x-auto space-x-4 pb-4" style={{ scrollbarWidth: 'thin' }}>
                    {collection.parts.map((part) => (
                        <div key={part.id} className="flex-shrink-0">
                          <MovieCard
                              id={part.id}
                              title={part.title}
                              posterUrl={
                                part.poster_path
                                    ? `https://image.tmdb.org/t/p/w500${part.poster_path}`
                                    : 'https://via.placeholder.com/200x300?text=No+Image'
                              }
                          />
                        </div>
                    ))}
                  </div>
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

        {/* 트레일러 모달 */}
        {isTrailerModalOpen && trailerKey && (
            <div
                className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50"
                onClick={closeTrailerModal}
            >
              <div className="relative w-11/12 md:w-3/4 lg:w-2/3 aspect-w-16 aspect-h-9" onClick={(e) => e.stopPropagation()}>
                <iframe
                    src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full rounded-lg shadow-lg"
                ></iframe>
                <button
                    onClick={closeTrailerModal}
                    className="absolute -top-10 -right-2 text-white text-4xl font-bold"
                >&times;</button>
              </div>
            </div>
        )}

      </div>
  );
};

export default MovieDetailPage;