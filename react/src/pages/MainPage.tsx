import React, { useState, useEffect, useRef, useCallback } from 'react';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import MovieCarousel from '../components/MovieCarousel';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axiosInstance';

interface Movie {
  id: number;
  title: string;
  poster_path: string;
}

interface ApiResult {
  results: Movie[];
  page: number;
  total_pages: number;
}

const genres = [
    { id: 28, name: '액션' }, { id: 12, name: '모험' }, { id: 16, name: '애니메이션' },
    { id: 35, name: '코미디' }, { id: 80, name: '범죄' }, { id: 99, name: '다큐멘터리' },
    { id: 18, name: '드라마' }, { id: 10751, name: '가족' }, { id: 14, name: '판타지' },
    { id: 36, name: '역사' }, { id: 27, name: '공포' }, { id: 10402, name: '음악' },
    { id: 9648, name: '미스터리' }, { id: 10749, name: '로맨스' }, { id: 878, name: 'SF' },
    { id: 10770, name: 'TV 영화' }, { id: 53, name: '스릴러' }, { id: 10752, name: '전쟁' },
    { id: 37, name: '서부' },
];

const MainPage: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);

  const { isLoggedIn } = useAuth();
  const [favoriteMovieIds, setFavoriteMovieIds] = useState<Set<number>>(new Set());

  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && currentPage < totalPages && !loadingMore) {
        setCurrentPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, currentPage, totalPages]);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (isLoggedIn) {
        try {
          const response = await axiosInstance.get<number[]>('/favorites');
          setFavoriteMovieIds(new Set(response.data));
        } catch (err) {
          console.error("찜 목록을 불러오는데 실패했습니다.", err);
        }
      } else {
        setFavoriteMovieIds(new Set());
      }
    };
    fetchFavorites();
  }, [isLoggedIn]);

  useEffect(() => {
    setMovies([]);
    setCurrentPage(1);
    setTotalPages(0);
  }, [selectedGenres, selectedYear, minRating]);

  useEffect(() => {
    const fetchMovies = async () => {
      if (currentPage === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
      let apiUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=ko-KR&sort_by=popularity.desc&page=${currentPage}`;
      if (selectedGenres.length > 0) apiUrl += `&with_genres=${selectedGenres.join(',')}`;
      if (selectedYear) apiUrl += `&primary_release_year=${selectedYear}`;
      if (minRating > 0) apiUrl += `&vote_average.gte=${minRating}`;

      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const data: ApiResult = await response.json();
        setMovies(prev => currentPage === 1 ? data.results : [...prev, ...data.results]);
        setTotalPages(data.total_pages);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };
    fetchMovies();
  }, [selectedGenres, selectedYear, minRating, currentPage]);

  const handleToggleFavorite = async (movieId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      alert("로그인이 필요합니다.");
      return;
    }

    const originalFavorites = new Set(favoriteMovieIds);
    const newFavoriteIds = new Set(favoriteMovieIds);
    if (newFavoriteIds.has(movieId)) {
      newFavoriteIds.delete(movieId);
    } else {
      newFavoriteIds.add(movieId);
    }
    setFavoriteMovieIds(newFavoriteIds);

    try {
      await axiosInstance.post(`/favorites/${movieId}`);
    } catch (err) {
      console.error("찜 상태 변경에 실패했습니다.", err);
      setFavoriteMovieIds(originalFavorites); // 에러 시 원상 복구
      alert("찜 상태 변경에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleGenreChange = (genreId: number) => {
    setSelectedGenres(prev => prev.includes(genreId) ? prev.filter(id => id !== genreId) : [...prev, genreId]);
  };

  const handleResetFilters = () => {
    setSelectedGenres([]);
    setSelectedYear('');
    setMinRating(0);
  };

  if (loading && currentPage === 1) {
    return (
      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col md:flex-row">
          <aside className="w-full md:w-64 p-5 bg-gray-100 dark:bg-gray-800"><h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">필터</h2></aside>
          <main className="flex-1 p-5">
            <div className="w-full h-96 bg-gray-300 dark:bg-gray-700 animate-pulse rounded-lg mb-8"></div>
            <h1 className="text-3xl font-bold text-center my-4 text-gray-800 dark:text-white">인기 영화</h1>
            <div className="flex flex-wrap justify-center">
              {Array.from({ length: 10 }).map((_, index) => <MovieCardSkeleton key={index} />)}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-12 text-2xl text-red-500">에러가 발생했습니다: {error.message}</div>;
  }

  return (
    <div className="max-w-screen-xl mx-auto">
      <div className="flex flex-col md:flex-row">
        <aside className="w-full md:w-64 p-5 bg-gray-100 dark:bg-gray-800 flex-shrink-0">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">필터</h2>
          <button onClick={handleResetFilters} className="w-full p-2 mb-4 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
            필터 초기화
          </button>
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-gray-800 dark:text-white">장르</h3>
            {genres.map(genre => (
              <div key={genre.id} className="flex items-center">
                <input type="checkbox" id={`genre-${genre.id}`} checked={selectedGenres.includes(genre.id)} onChange={() => handleGenreChange(genre.id)} className="mr-2" />
                <label htmlFor={`genre-${genre.id}`} className="text-gray-700 dark:text-gray-300">{genre.name}</label>
              </div>
            ))}
          </div>
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-gray-800 dark:text-white">개봉 연도</h3>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600">
              <option value="">전체</option>
              {Array.from({ length: new Date().getFullYear() - 1979 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-gray-800 dark:text-white">최소 평점: <span className="font-bold text-blue-500">{minRating.toFixed(1)}</span></h3>
            <input type="range" min="0" max="10" step="0.5" value={minRating} onChange={e => setMinRating(parseFloat(e.target.value))} className="w-full" />
          </div>
        </aside>
        <main className="flex-1 p-5 min-w-0">
          <MovieCarousel />
          <h1 className="text-3xl font-bold text-center my-4 text-gray-800 dark:text-white">인기 영화</h1>
          <div className="flex flex-wrap justify-center">
            {movies.length > 0 ? movies.map(movie => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'}
                isFavorite={favoriteMovieIds.has(movie.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            )) : !loading && <p className="mt-8 text-gray-800 dark:text-white text-center">선택한 조건에 맞는 영화가 없습니다.</p>}
            {loadingMore && Array.from({ length: 4 }).map((_, index) => <MovieCardSkeleton key={`loading-${index}`} />)}
          </div>
          <div ref={loadMoreRef} style={{ height: '20px' }} />
        </main>
      </div>
    </div>
  );
};

export default MainPage;
