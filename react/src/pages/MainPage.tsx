import React, { useState, useEffect, useRef, useCallback } from 'react';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import MovieCarousel from '../components/MovieCarousel'; // 개선된 MovieCarousel 임포트
import MovieSectionCarousel from '../components/MovieSectionCarousel'; // 새로 추가된 MovieSectionCarousel 임포트
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

interface Genre {
  id: number;
  name: string;
}

interface FilterOptionsResponse {
  genres: Genre[];
  minRating: number;
  maxRating: number;
}

const MainPage: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);

  const { isLoggedIn } = useAuth();
  const [favoriteMovieIds, setFavoriteMovieIds] = useState<Set<number>>(new Set());

  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement) => {
    if (loading || loadingMore) return; // 로딩 중일 때는 추가 호출 방지
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && currentPage < totalPages) {
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
    const fetchFilterOptions = async () => {
      try {
        const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
        const response = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=ko-KR`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setGenres(data.genres);
      } catch (err) {
        console.error("필터 옵션을 가져오는데 실패했습니다.", err);
      }
    };
    fetchFilterOptions();
  }, []);

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
      setFavoriteMovieIds(originalFavorites);
      alert("찜 상태 변경에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleGenreChange = (genreId: number) => {
    setSelectedGenres(prev => prev.includes(genreId) ? prev.filter(id => id !== genreId) : [...prev, genreId]);
    setCurrentPage(1); // 필터 변경 시 페이지 초기화
    setMovies([]); // 필터 변경 시 영화 목록 초기화
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setCurrentPage(1); // 필터 변경 시 페이지 초기화
    setMovies([]); // 필터 변경 시 영화 목록 초기화
  };

  const handleRatingChange = (rating: number) => {
    setMinRating(rating);
    setCurrentPage(1); // 필터 변경 시 페이지 초기화
    setMovies([]); // 필터 변경 시 영화 목록 초기화
  };

  const handleResetFilters = () => {
    setSelectedGenres([]);
    setSelectedYear('');
    setMinRating(0);
    setCurrentPage(1); // 필터 초기화 시 페이지 초기화
    setMovies([]); // 필터 초기화 시 영화 목록 초기화
  };

  if (error) {
    return <div className="text-center p-12 text-2xl text-red-500">에러가 발생했습니다: {error.message}</div>;
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white">
      <MovieCarousel /> {/* 히어로 섹션으로 사용 */}

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 추가된 영화 섹션들 */}
        <MovieSectionCarousel title="인기 영화" fetchUrl="https://api.themoviedb.org/3/movie/popular" />
        <MovieSectionCarousel title="높은 평점 영화" fetchUrl="https://api.themoviedb.org/3/movie/top_rated" />
        <MovieSectionCarousel title="개봉 예정 영화" fetchUrl="https://api.themoviedb.org/3/movie/upcoming" />

        <div className="flex flex-col md:flex-row gap-8 mt-12"> {/* gap 추가 */}
          <aside className="w-full md:w-64 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex-shrink-0">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">필터</h2>
            <button onClick={handleResetFilters} className="w-full p-3 mb-6 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold">
              필터 초기화
            </button>
            <div className="mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-white">장르</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar"> {/* 스크롤바 추가 */}
                {genres.map(genre => (
                  <div key={genre.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`genre-${genre.id}`}
                      checked={selectedGenres.includes(genre.id)}
                      onChange={() => handleGenreChange(genre.id)}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor={`genre-${genre.id}`} className="text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-500 transition-colors">
                      {genre.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-white">개봉 연도</h3>
              <select
                value={selectedYear}
                onChange={e => handleYearChange(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">전체</option>
                {Array.from({ length: new Date().getFullYear() - 1979 + 1 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-white">최소 평점: <span className="font-bold text-blue-500">{minRating.toFixed(1)}</span></h3>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={minRating}
                onChange={e => handleRatingChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500"
              />
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <h1 className="text-4xl font-extrabold text-center mb-8 text-gray-800 dark:text-white">영화 목록</h1>
            {loading && currentPage === 1 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                {Array.from({ length: 10 }).map((_, index) => <MovieCardSkeleton key={index} staggerIndex={index} />)}
              </div>
            ) : (
              <>
                {movies.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                    {movies.map((movie, index) => (
                      <MovieCard
                        key={movie.id}
                        id={movie.id}
                        title={movie.title}
                        posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'}
                        isFavorite={favoriteMovieIds.has(movie.id)}
                        onToggleFavorite={handleToggleFavorite}
                        staggerIndex={index}
                      />
                    ))}
                  </div>
                ) : (
                  !loading && <p className="mt-8 text-gray-800 dark:text-white text-center text-xl">선택한 조건에 맞는 영화가 없습니다.</p>
                )}
                {loadingMore && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10 mt-10">
                    {Array.from({ length: 5 }).map((_, index) => <MovieCardSkeleton key={`loading-more-${index}`} staggerIndex={index} />)}
                  </div>
                )}
                <div ref={loadMoreRef} style={{ height: '20px', margin: '20px 0' }} />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainPage;