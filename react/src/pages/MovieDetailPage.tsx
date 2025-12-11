import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import StarRating from '../components/StarRating';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axiosInstance';
import axios from 'axios';

// --- 타입 정의 ---
interface MovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genres: { id: number; name: string }[];
  is_now_playing?: boolean;
  runtime?: number;
  certification?: string;
  ott_providers?: string[];
  ott_link?: string;

  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
}

interface AiReviewSummary {
  goodPoints: string;
  badPoints: string;
  overall: string;
  positiveRatio: number;
  negativeRatio: number;
  neutralRatio: number;
}

interface CombinedReview {
  source: string;
  author: string;
  content: string;
  translated?: string | null;
  rating: number | null;
  createdAt: string | null;
}

interface Video { key: string; site: string; type: string; name: string; }
interface RecommendedMovie { id: number; title: string; poster_path: string; }
interface Cast { id: number; name: string; character: string; profile_path: string | null; }
interface Collection { id: number; name: string; overview: string; poster_path: string | null; backdrop_path: string | null; parts: RecommendedMovie[]; }

interface Review {
  id: number;
  movieId: string;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
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

// --- 스켈레톤 UI ---
const MovieDetailSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="relative w-full h-[60vh] bg-gray-300 dark:bg-gray-700">
      <div className="relative max-w-5xl mx-auto p-4 md:p-8 h-full flex items-center">
        <div className="w-48 md:w-64 h-72 md:h-96 bg-gray-400 dark:bg-gray-600 rounded-lg shadow-2xl z-10" />
        <div className="md:ml-8 mt-5 md:mt-0 flex-1">
          <div className="h-10 bg-gray-400 dark:bg-gray-600 rounded w-3/4" />
          <div className="h-5 bg-gray-400 dark:bg-gray-600 rounded w-24 mt-4" />
          <div className="h-4 bg-gray-400 dark:bg-gray-600 rounded w-full mt-4" />
          <div className="h-4 bg-gray-400 dark:bg-gray-600 rounded w-5/6 mt-2" />
        </div>
      </div>
    </div>
  </div>
);

const MovieDetailPage: React.FC = () => {
  const { movieId } = useParams<{ movieId: string }>();
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [cast, setCast] = useState<Cast[]>([]);
  const [collection] = useState<Collection | null>(null);
  const [recommendedMovies, setRecommendedMovies] = useState<RecommendedMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const overviewRef = useRef<HTMLParagraphElement>(null);
  const recommendationsRef = useRef<HTMLDivElement>(null);

  // 찜하기 & 별점 상태
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  // 리뷰 관련 상태
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
    // AI 요약 + 외부(TMDB) 리뷰 상태
  const [aiSummary, setAiSummary] = useState<AiReviewSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [externalReviews, setExternalReviews] = useState<CombinedReview[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);


  // Movie details fetching
  useEffect(() => {
    if (!movieId) return;
    
    // 상태 초기화
    setMovie(null);
    setAllReviews([]);
    setMyReview(null);
    setReviewRating(0);
    setReviewComment('');
    setIsEditingReview(false);
    setAverageRating(0);

    const fetchAllDetails = async () => {
      setLoading(true);
      try {
        const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
        const [detailsRes, videosRes, creditsRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=ko-KR`),
          fetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${apiKey}`),
          fetch(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${apiKey}&language=ko-KR`)
        ]);
        const detailsData = await detailsRes.json();
        const videosData = await videosRes.json();
        const creditsData = await creditsRes.json();

        try {
          const backendResponse = await axios.get(`http://localhost:8484/api/movies/${movieId}`);
          const myData = backendResponse.data
          if (myData) {
            detailsData.ott_providers = backendResponse.data.ott_providers;
            detailsData.ott_link = backendResponse.data.ott_link;
            detailsData.is_now_playing = backendResponse.data.is_now_playing;

            if (myData.runtime) detailsData.runtime = myData.runtime;
            if (myData.certification) detailsData.certification = myData.certification;
          }
        } catch (error) { console.warn("OTT info not found in backend."); }

        setMovie(detailsData);
        const officialTrailer = videosData.results.find((v: Video) => v.type === 'Trailer') || videosData.results[0];
        if (officialTrailer) setTrailerKey(officialTrailer.key);
        if (creditsData.cast) setCast(creditsData.cast.slice(0, 10));

      } catch (error) {
        console.error("Failed to fetch movie details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllDetails();
  }, [movieId]);

  // User interactions fetching (favorite, rating)
  useEffect(() => {
    if (!movieId || !isLoggedIn) {
      setIsFavorite(false);
      return;
    }
    const fetchUserInteractions = async () => {
      try {
        const favResponse = await axiosInstance.get(`/favorites/${movieId}`);
        setIsFavorite(favResponse.data.isFavorited);
      } catch (error) {
        console.error("Failed to fetch user interactions:", error);
      }
    };
    fetchUserInteractions();
  }, [movieId, isLoggedIn]);

  // Recommended movies fetching
  useEffect(() => {
    if (!movie || movie.genres.length === 0) return;
    const fetchRecommendations = async () => {
      const genreIds = movie.genres.map(g => g.id).join(',');
      try {
        const response = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb&language=ko-KR&with_genres=${genreIds}&sort_by=popularity.desc`);
        const data = await response.json();
        setRecommendedMovies(data.results.filter((rec: RecommendedMovie) => rec.id !== movie.id).slice(0, 10));
      } catch (error) { console.error("Failed to fetch recommendations:", error); }
    };
    fetchRecommendations();
  }, [movie]);

  // Overview clamping
  useEffect(() => {
    if (overviewRef.current) {
      setIsClamped(overviewRef.current.scrollHeight > overviewRef.current.clientHeight);
    }
  }, [movie?.overview]);

  // Watchlist 상태 fetching (백엔드 연동)
  useEffect(() => {
    if (!movieId) return;
    if (!isLoggedIn) {
      setIsInWatchlist(false);
      return;
    }

    const fetchWatchlistStatus = async () => {
      try {
        const response = await axiosInstance.get<boolean>(`/watchlist/${movieId}`);
        setIsInWatchlist(response.data);
      } catch (error) {
        console.error("Failed to fetch watchlist status:", error);
        setIsInWatchlist(false);
      }
    };
    fetchWatchlistStatus();
  }, [movieId, isLoggedIn]);

  // 리뷰 데이터 fetching 및 평균 별점 계산
  useEffect(() => {
    if (!movieId) return;

    const fetchAllReviews = async () => {
      try {
        const response = await axiosInstance.get<Review[]>(`/reviews/movie/${movieId}`);
        const reviews = response.data;
        setAllReviews(reviews);

        if (reviews.length > 0) {
          const totalRating = reviews.reduce((acc, cur) => acc + cur.rating, 0);
          setAverageRating(totalRating / reviews.length);
        } else {
          setAverageRating(0);
        }
      } catch (error) {
        console.error("Failed to fetch all reviews:", error);
        setAllReviews([]);
      }
    };

    const fetchMyReview = async () => {
      if (!isLoggedIn) {
        setMyReview(null);
        setReviewRating(0);
        setReviewComment('');
        setIsEditingReview(false);
        return;
      }
      try {
        const response = await axiosInstance.get<Review>(`/reviews/movie/${movieId}/my-review`);
        setMyReview(response.data);
        setReviewRating(response.data.rating);
        setReviewComment(response.data.comment);
        setIsEditingReview(true);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setMyReview(null);
          setReviewRating(0);
          setReviewComment('');
          setIsEditingReview(false);
        } else {
          console.error("Failed to fetch my review:", error);
        }
      }
    };

    fetchAllReviews();
    fetchMyReview();
  }, [movieId, isLoggedIn]);

  // TMDB 외부 리뷰 (대표 N개)만 가져오기
useEffect(() => {
  if (!movieId) return;

  const fetchExternalReviews = async () => {
    try {
      // 백엔드: GET /api/movies/{movieId}/reviews?limit=10
      const resp = await axiosInstance.get<{
        movieId: string;
        reviews: CombinedReview[];
      }>(`/movies/${movieId}/reviews`, {
        params: { limit: 10 }, // 일단 대표 10개만
      });

      const tmdbReviews = resp.data.reviews.filter(
        (r) => r.source && r.source.startsWith('TMDB'),
      );

      setExternalReviews(tmdbReviews);
    } catch (error) {
      console.error('Failed to fetch external reviews:', error);
      setExternalReviews([]);
    }
  };

  fetchExternalReviews();
}, [movieId]);

// AI 요약만 별도 호출
useEffect(() => {
  if (!movieId) return;

  setAiError(null);
  setAiSummary(null);

  const fetchAiSummary = async () => {
    setAiLoading(true);

    try {
      const resp = await axiosInstance.get<AiReviewSummary>(
        `/movies/${movieId}/review-summary`
      );
      setAiSummary(resp.data);
    } catch (error) {
      console.error('Failed to fetch AI summary:', error);
      setAiError('AI 기반 리뷰 요약을 불러오는 데 실패했습니다.');
    } finally {
      setAiLoading(false);
    }
  };

  fetchAiSummary();
}, [movieId]);

  const toggleFavorite = async () => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    if (!movieId) return;
    const originalState = isFavorite;
    setIsFavorite(!originalState);
    try {
      await axiosInstance.post(`/favorites/${movieId}`);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      setIsFavorite(originalState);
      alert("찜 상태 변경에 실패했습니다.");
    }
  };

  const handleRatingChange = async (newRating: number) => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (!movieId) return;
    
    setReviewRating(newRating); // UI 즉시 업데이트

    const reviewData = {
      movieId: movieId,
      rating: newRating,
      comment: myReview?.comment || reviewComment || " ", // 코멘트가 없으면 기본값 전달
    };

    try {
      if (myReview) {
        await axiosInstance.put(`/reviews/${myReview.id}`, reviewData);
      } else {
        const response = await axiosInstance.post('/reviews', reviewData);
        setMyReview(response.data);
        setIsEditingReview(true);
      }
      // 리뷰 목록 새로고침
      const allReviewsResponse = await axiosInstance.get<Review[]>(`/reviews/movie/${movieId}`);
      setAllReviews(allReviewsResponse.data);
    } catch (error) {
      console.error("Failed to update rating:", error);
      alert("별점 등록/수정에 실패했습니다.");
    }
  };

  const toggleWatchlist = async () => {
    if (!isLoggedIn) {
      alert('로그인이 필요한 기능입니다.');
      navigate('/login');
      return;
    }
    if (!movieId) return;

    try {
      const response = await axiosInstance.post<boolean>(`/watchlist/${movieId}`);
      setIsInWatchlist(response.data);
      alert(response.data ? 'Watchlist에 추가되었습니다.' : 'Watchlist에서 제거되었습니다.');
    } catch (error) {
      console.error("Failed to toggle watchlist:", error);
      alert("Watchlist 상태 변경에 실패했습니다.");
    }
  };

  const handleBooking = () => {
    if (isLoggedIn) {
      alert('예매 페이지로 이동합니다. (구현 필요)');
    } else {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/login');
    }
  };

  const openTrailerModal = () => setIsTrailerModalOpen(true);
  const closeTrailerModal = () => setIsTrailerModalOpen(false);

  const scroll = (direction: 'left' | 'right') => {
    if (recommendationsRef.current) {
      const scrollAmount = recommendationsRef.current.clientWidth * 0.8;
      recommendationsRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const getOttSearchLink = (providerName: string, movieTitle: string) => {
    const titleEncoded = encodeURIComponent(movieTitle);
    const pName = providerName.toLowerCase();

    if (pName.includes('netflix')) return `https://www.netflix.com/search?q=${titleEncoded}`;
    if (pName.includes('disney')) return `https://www.disneyplus.com/search?q=${titleEncoded}`;
    if (pName.includes('wavve')) return `https://www.wavve.com/search?searchWord=${titleEncoded}`;
    if (pName.includes('watcha')) return `https://watcha.com/search?query=${titleEncoded}`;
    if (pName.includes('tving')) return `https://www.tving.com/search?keyword=${titleEncoded}`;
    if (pName.includes('coupang')) return `https://www.coupangplay.com/search?q=${titleEncoded}`;
    if (pName.includes('apple')) return `https://tv.apple.com/kr/search?term=${titleEncoded}`;

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
    return undefined;
  }

  // 리뷰 제출 (작성 또는 수정)
  const handleSubmitReview = async () => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    if (!movieId) return;
    if (reviewRating === 0) {
      alert('평점을 선택해주세요.');
      return;
    }
    if (reviewComment.trim() === '') {
      alert('리뷰 내용을 입력해주세요.');
      return;
    }

    const reviewData = {
      movieId: movieId,
      rating: reviewRating,
      comment: reviewComment,
    };

    try {
      if (isEditingReview && myReview) {
        const response = await axiosInstance.put(`/reviews/${myReview.id}`, reviewData);
        setMyReview(response.data);
        alert('리뷰가 수정되었습니다.');
      } else {
        const response = await axiosInstance.post('/reviews', reviewData);
        setMyReview(response.data);
        setIsEditingReview(true);
        alert('리뷰가 작성되었습니다.');
      }
      const allReviewsResponse = await axiosInstance.get<Review[]>(`/reviews/movie/${movieId}`);
      setAllReviews(allReviewsResponse.data);
    } catch (error) {
      console.error("Failed to submit review:", error);
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        alert('이미 이 영화에 대한 리뷰를 작성했습니다. 수정해주세요.');
      } else {
        alert('리뷰 제출에 실패했습니다.');
      }
    }
  };

  // 리뷰 삭제
  const handleDeleteReview = async () => {
    if (!isLoggedIn || !myReview) {
      alert('로그인이 필요하거나 삭제할 리뷰가 없습니다.');
      return;
    }

    if (!window.confirm('정말로 리뷰를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await axiosInstance.delete(`/reviews/${myReview.id}`);
      setMyReview(null);
      setReviewRating(0);
      setReviewComment('');
      setIsEditingReview(false);
      alert('리뷰가 삭제되었습니다.');
      const allReviewsResponse = await axiosInstance.get<Review[]>(`/reviews/movie/${movieId}`);
      setAllReviews(allReviewsResponse.data);
    } catch (error) {
      console.error("Failed to delete review:", error);
      alert('리뷰 삭제에 실패했습니다.');
    }
  };
  //런타임
  const formatRuntime = (minutes: number | undefined) => {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}시간 ${m}분`;
  };

  //등급 색상
  const getCertColor = (cert: string | undefined) => {
    if (!cert) return 'bg-gray-500';
    if (cert === 'All' || cert === 'ALL') return 'bg-green-600';
    if (cert === '12') return 'bg-yellow-500 text-black';
    if (cert === '15') return 'bg-orange-600';
    if (cert === '18' || cert.includes('청불')) return 'bg-red-600';
    return 'bg-gray-600';
  };

  // === 여기서부터: 리뷰 카운트 + 통합 리스트 생성 ===
  const totalReviewCount = allReviews.length + externalReviews.length;

  const combinedReviews = [
    // 앱 유저 리뷰
    ...allReviews.map((r) => ({
      type: 'USER' as const,
      key: `user-${r.id}`,
      userName: r.userName,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.updatedAt,
      source: 'APP',
      originalContent: null as string | null,
    })),
    // TMDB 리뷰
    ...externalReviews.map((r, idx) => ({
      type: 'TMDB' as const,
      key: `tmdb-${idx}`,
      userName: r.author || '익명',
      rating: r.rating,
      comment: r.translated || r.content,
      createdAt: r.createdAt,
      source: r.source,
      originalContent: r.translated ? r.content : null,
    })),
  ];

  // 전체 중에서 실제로 화면에 보여줄 리스트 (대표 3개 or 전체)
const visibleReviews = showAllReviews
  ? combinedReviews
  : combinedReviews.slice(0, 3); // 처음에는 3개만


  if (loading) {
    return <MovieDetailSkeleton />;
  }

  if (!movie) {
    return <div className="text-center p-12 text-2xl text-gray-800 dark:text-white">영화 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-900">
      <AppHeader />

      {/* 상단 정보 섹션 */}
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
                  <button onClick={toggleFavorite} className="p-2 rounded-full bg-black bg-opacity-30 hover:bg-opacity-50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isFavorite ? 'text-red-500' : 'text-white'}`} fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                    </svg>
                  </button>
                  <button onClick={toggleWatchlist} className="p-2 rounded-full bg-black bg-opacity-30 hover:bg-opacity-50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isInWatchlist ? 'text-yellow-400' : 'text-white'}`} fill={isInWatchlist ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center md:justify-start space-x-4 mt-2">
                <span>TMDB 평점: ⭐ {movie.vote_average.toFixed(1)}</span>
                <span>|</span>
                {averageRating > 0 && (
                  <>
                    <span>앱 평점: ⭐ {averageRating.toFixed(1)}</span>
                    <span>|</span>
                  </>
                )}
                <span>{movie.release_date}</span>
                {movie.runtime && (
                  <>
                    <span>|</span>
                    <span>{formatRuntime(movie.runtime)}</span>
                  </>
                )}
                {movie.certification && (
                  <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ml-2 ${getCertColor(movie.certification)}`}>
                    {movie.certification === 'All' ? '전체' : `${movie.certification}세`}
                  </span>
                )}
              </div>
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
                  <button onClick={() => setIsOverviewExpanded(!isOverviewExpanded)} className="text-gray-300 hover:text-white font-semibold mt-1">
                    {isOverviewExpanded ? '접기' : '더보기'}
                  </button>
                )}
              </div>

              <div className="mt-8 flex items-center justify-center md:justify-start space-x-4">
                <button
                  onClick={handleBooking}
                  disabled={!movie.is_now_playing}
                  className={`font-bold py-3 px-8 rounded-lg text-lg transition-colors ${movie.is_now_playing
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-red-400 text-gray-300 cursor-not-allowed'
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
                          const logoUrl = getProviderLogoUrl(provider);

                          return (
                            <a
                              key={index}
                              href={getOttSearchLink(provider, movie.title)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                            >
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

      {/* 하단 컨텐츠 섹션 */}
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        {/* 주요 출연진 섹션 */}
        {cast.length > 0 && (
          <div className="mt-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">주요 출연진</h2>
            <div className="flex overflow-x-auto space-x-4 pb-4" style={{ scrollbarWidth: 'thin' }}>
              {cast.map((actor) => (
                <Link to={`/person/${actor.id}`} key={actor.id} className="flex-shrink-0 w-32 text-center no-underline">
                  <div>
                    <img
                      src={actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://via.placeholder.com/185x278?text=No+Image'}
                      alt={actor.name}
                      className="w-full h-48 object-cover rounded-lg shadow-md bg-gray-200 dark:bg-gray-700 transform hover:scale-105 transition-transform duration-200"
                    />
                    <p className="mt-2 font-semibold text-sm text-gray-900 dark:text-white">{actor.name}</p>
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
                      isFavorite={false}
                      onToggleFavorite={() => { }}
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
            <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">비슷한 장르의 추천 영화</h2>
            <div className="relative">
              {/* 왼쪽 스크롤 버튼 */}
              <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity">
                &#10094;
              </button>
              {/* 캐러셀 컨테이너 */}
              <div
                ref={recommendationsRef}
                className="flex overflow-x-auto space-x-4 p-2 -m-2 scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
              >
                {recommendedMovies.map(recMovie => (
                  // 각 카드가 줄어들지 않도록 flex-shrink-0을 추가합니다.
                  <div key={recMovie.id} className="flex-shrink-0">
                    <MovieCard id={recMovie.id} title={recMovie.title} posterUrl={recMovie.poster_path ? `https://image.tmdb.org/t/p/w500${recMovie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'} isFavorite={false} onToggleFavorite={() => { }} />
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

        {/* AI 리뷰 요약 섹션 */}
        <div className="mt-12">
          <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">
            AI 리뷰 한눈에 보기
          </h2>

          {aiLoading && (
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <p className="text-gray-700 dark:text-gray-300">
                리뷰 요약을 불러오는 중입니다...
              </p>
            </div>
          )}

          {aiError && !aiLoading && !aiSummary && (
            <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg">
              <p className="text-red-700 dark:text-red-200">{aiError}</p>
            </div>
          )}

          {aiSummary && !aiLoading && (
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                TMDB/앱 리뷰를 기반으로 한 AI 요약입니다.
              </p>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-1">한 줄 요약</h3>
                <p className="text-gray-800 dark:text-gray-200">{aiSummary.overall}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-1">좋았던 점</h3>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">
                  {aiSummary.goodPoints}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-1">아쉬운 점</h3>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">
                  {aiSummary.badPoints}
                </p>
              </div>
              <div className="flex gap-4 text-sm text-gray-700 dark:text-gray-300">
                <span>👍 긍정 {Math.round(aiSummary.positiveRatio * 100)}%</span>
                <span>👎 부정 {Math.round(aiSummary.negativeRatio * 100)}%</span>
                <span>😐 중립 {Math.round(aiSummary.neutralRatio * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* 리뷰 섹션 */}
        <div className="mt-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">리뷰</h2>

          {isLoggedIn ? (
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
                {isEditingReview ? '내 리뷰 수정' : '리뷰 작성'}
              </h3>
              <div className="flex items-center mb-4">
                <span className="text-lg font-medium text-gray-700 dark:text-gray-300 mr-3">평점:</span>
                <StarRating
                  rating={reviewRating}
                  onRatingChange={handleRatingChange}
                  maxRating={10}
                  size="md"
                />
              </div>

              <textarea
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={4}
                placeholder="이 영화에 대한 당신의 생각을 공유해주세요..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              ></textarea>
              <div className="flex justify-end mt-4 space-x-3">
                {isEditingReview && (
                  <button
                    onClick={handleDeleteReview}
                    className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-semibold"
                  >
                    삭제
                  </button>
                )}
                <button
                  onClick={handleSubmitReview}
                  className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
                >
                  {isEditingReview ? '수정' : '작성'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-center py-4">
              리뷰를 작성하려면{' '}
              <Link to="/login" className="text-blue-500 hover:underline">
                로그인
              </Link>{' '}
              해주세요.
            </p>
          )}

          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              모든 리뷰 ({totalReviewCount})
            </h3>

            {combinedReviews.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">
                아직 작성된 리뷰가 없습니다.
              </p>
            ) : (
              <div className="space-y-6">
                {visibleReviews.map((review) => {
                  const isTmdb = review.source.startsWith('TMDB');
                  const dateLabel = review.createdAt ? new Date(review.createdAt).toLocaleDateString() : '';

                  // 10점 만점 평점을 5개 별로 표현 (반쪽 별 포함)
                  const displayRating = (review.rating ?? 0) / 2;

                  return (
                    <div key={review.key} className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <span className="font-bold text-lg text-gray-900 dark:text-white">{review.userName}</span>
                          {isTmdb && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full border border-gray-400 text-gray-600 dark:text-gray-300">TMDB 리뷰</span>
                          )}
                          {review.rating != null && (
                            <div className="ml-3 flex items-center">
                              <StarRating
                                rating={review.rating}
                                maxRating={10}
                                readOnly={true}
                                size="sm"
                              />
                              <span className="ml-2 text-gray-700 dark:text-gray-300 text-sm">
                                ({review.rating.toFixed(1)})
                              </span>
                            </div>
                          )}
                        </div>
                        {dateLabel && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">{dateLabel}</span>
                        )}
                      </div>

                      <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">{review.comment}</p>

                      {isTmdb && review.originalContent && (
                        <details className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <summary className="cursor-pointer">원문 보기</summary>
                          <p className="mt-1 whitespace-pre-line">{review.originalContent}</p>
                        </details>
                      )}
                    </div>
                  );
                })}

                {combinedReviews.length > 3 && (
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={() => setShowAllReviews((prev) => !prev)}
                      className="px-4 py-2 text-sm font-semibold border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {showAllReviews ? '리뷰 접기' : '리뷰 전체보기'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div> {/* 하단 컨텐츠 섹션 끝 */}

      {/* 트레일러 모달 */}
      {isTrailerModalOpen && trailerKey && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50"
          onClick={closeTrailerModal}
        >
          <div
            className="relative w-11/12 md:w-3/4 lg:w-2/3 aspect-w-16 aspect-h-9"
            onClick={(e) => e.stopPropagation()}
          >
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
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetailPage;
