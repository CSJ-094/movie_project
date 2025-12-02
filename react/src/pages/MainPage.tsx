// c:/dev/work_springboot/movie-frontend/src/pages/MainPage.tsx
import React, { useState, useEffect } from 'react';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';

// API로부터 받아올 영화 데이터의 타입을 정의합니다.
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

// 장르 목록 (TMDb API 기준)
const genres = [
  { id: 28, name: '액션' },
  { id: 12, name: '모험' },
  { id: 16, name: '애니메이션' },
  { id: 35, name: '코미디' },
  { id: 80, name: '범죄' },
  { id: 99, name: '다큐멘터리' },
  { id: 18, name: '드라마' },
  { id: 10751, name: '가족' },
  { id: 14, name: '판타지' },
  { id: 36, name: '역사' },
  { id: 27, name: '공포' },
  { id: 10402, name: '음악' },
  { id: 9648, name: '미스터리' },
  { id: 10749, name: '로맨스' },
  { id: 878, name: 'SF' },
  { id: 10770, name: 'TV 영화' },
  { id: 53, name: '스릴러' },
  { id: 10752, name: '전쟁' },
  { id: 37, name: '서부' },
];

const MainPage: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false); // '더보기' 로딩 상태
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // 필터 상태 관리
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  
  // 필터가 변경되면 영화 목록과 페이지를 초기화하는 로직
  useEffect(() => {
    setMovies([]);
    setCurrentPage(1);
  }, [selectedGenres, selectedYear, minRating]);

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      setError(null);

      // '더보기' 로딩 상태를 활성화합니다. (첫 페이지 로딩 시에는 전체 로딩이므로 false)
      if (currentPage > 1) {
        setLoadingMore(true);
      }

      // API URL 생성
      const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
      let apiUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=ko-KR&sort_by=popularity.desc`;

      if (selectedGenres.length > 0) {
        apiUrl += `&with_genres=${selectedGenres.join(',')}`;
      }
      if (selectedYear) {
        apiUrl += `&primary_release_year=${selectedYear}`;
      }
      if (minRating > 0) {
        apiUrl += `&vote_average.gte=${minRating}`;
      }
      apiUrl += `&page=${currentPage}`;

      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data: ApiResult = await response.json();
        // 첫 페이지는 새로 설정, 이후 페이지는 기존 목록에 추가
        setMovies(prevMovies => currentPage === 1 ? data.results : [...prevMovies, ...data.results]);
        setTotalPages(data.total_pages);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchMovies();
  }, [selectedGenres, selectedYear, minRating, currentPage]); // 필터 또는 현재 페이지가 변경될 때마다 API 재호출

  const handleLoadMore = () => {
    // 다음 페이지 로드를 위해 현재 페이지 번호를 1 증가시킵니다.
    // 이 상태 변경은 위 useEffect를 다시 트리거합니다.
    if (currentPage < totalPages) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  };

  const handleGenreChange = (genreId: number) => {
    setSelectedGenres(prev =>
      prev.includes(genreId) ? prev.filter(id => id !== genreId) : [...prev, genreId]
    );
  };

  const handleResetFilters = () => {
    setSelectedGenres([]);
    setSelectedYear('');
    setMinRating(0);
  };

  if (loading && currentPage === 1) { // 첫 페이지 로딩 시에만 전체 스켈레톤 표시
    return (
      <div className="flex">
        <aside className="w-64 p-5 bg-gray-100 dark:bg-gray-800"><h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">필터</h2></aside>
        <main className="flex-1 p-5">
          <h1 className="text-3xl font-bold text-center mb-4 text-gray-800 dark:text-white">영화 목록</h1>
          <div className="flex flex-wrap justify-center">
            {Array.from({ length: 10 }).map((_, index) => (
              <MovieCardSkeleton key={index} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-12 text-2xl text-red-500">에러가 발생했습니다: {error.message}</div>;
  }

  return (
    <div className="flex flex-col md:flex-row">
      {/* 왼쪽 필터 패널 */}
      <aside className="w-full md:w-64 p-5 bg-gray-100 dark:bg-gray-800">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">필터</h2>
        <button
          onClick={handleResetFilters}
          className="w-full p-2 mb-4 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          필터 초기화
        </button>
        {/* 장르 필터 */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2 text-gray-800 dark:text-white">장르</h3>
          {genres.map(genre => (
            <div key={genre.id} className="flex items-center">
              <input type="checkbox" id={`genre-${genre.id}`} checked={selectedGenres.includes(genre.id)} onChange={() => handleGenreChange(genre.id)} className="mr-2" />
              <label htmlFor={`genre-${genre.id}`} className="text-gray-700 dark:text-gray-300">{genre.name}</label>
            </div>
          ))}
        </div>

        {/* 연도 필터 */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2 text-gray-800 dark:text-white">개봉 연도</h3>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full p-2 rounded bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600"
          >
            <option value="">전체</option>
            {/* 현재 연도부터 1980년까지 옵션 생성 */}
            {Array.from({ length: new Date().getFullYear() - 1979 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>
        </div>

        {/* 평점 필터 */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2 text-gray-800 dark:text-white">최소 평점: <span className="font-bold text-blue-500">{minRating.toFixed(1)}</span></h3>
          <input
            type="range"
            min="0" max="10" step="0.5"
            value={minRating}
            onChange={(e) => setMinRating(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </aside>

      {/* 오른쪽 영화 목록 */}
      <main className="flex-1 p-5">
        <h1 className="text-3xl font-bold text-center mb-4 text-gray-800 dark:text-white">영화 목록</h1>
        <div className="flex flex-wrap justify-center">
          {movies.length > 0 ? movies.map(movie => (
            <MovieCard key={movie.id} id={movie.id} title={movie.title} posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'} />
          )) : <p className="mt-8 text-gray-800 dark:text-white">선택한 조건에 맞는 영화가 없습니다.</p>}
        </div>

        {/* 더보기 버튼 UI */}
        <div className="flex justify-center mt-8">
          {currentPage < totalPages && !loading && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg disabled:bg-gray-400 hover:bg-blue-600 transition-colors"
            >
              {loadingMore ? '로딩 중...' : '더보기'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default MainPage;
