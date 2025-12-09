import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import MovieCarousel from '../components/MovieCarousel';
import MovieSectionCarousel from '../components/MovieSectionCarousel';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axiosInstance';

// TMDB API Key는 환경 변수에서 가져오는 것이 가장 좋습니다.
const TMDB_API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const NO_IMAGE_URL = 'https://via.placeholder.com/200x300?text=No+Image';

interface Movie {
    id: string;
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

interface UserProfile {
    favoriteMovieIds: string[];
    watchlistMovies: { movieId: string; watched: boolean }[];
}

// 필터 상태 변경 시 데이터를 리셋하는 공통 함수
const resetFilterState = (setter: React.Dispatch<React.SetStateAction<any>>, newValue: any, setCurrentPage: (page: number) => void, setMovies: (movies: Movie[]) => void) => {
    setCurrentPage(1);
    setMovies([]);
    setter(newValue);
};

// ======================================================================
// (선택적) FilterSidebar 컴포넌트 (실제 프로젝트에서는 별도 파일로 분리 권장)
// ======================================================================
interface FilterSidebarProps {
    genres: Genre[];
    selectedGenres: number[];
    selectedYear: string;
    minRating: number;
    handleGenreChange: (genreId: number) => void;
    handleYearChange: (year: string) => void;
    handleRatingChange: (rating: number) => void;
    handleResetFilters: () => void;
    handleQuickMatchClick: () => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
                                                         genres,
                                                         selectedGenres,
                                                         selectedYear,
                                                         minRating,
                                                         handleGenreChange,
                                                         handleYearChange,
                                                         handleRatingChange,
                                                         handleResetFilters,
                                                         handleQuickMatchClick,
                                                     }) => {
    // 현재 연도 기준으로 1980년부터의 연도 배열 생성
    const currentYear = new Date().getFullYear();
    const years = useMemo(() =>
            Array.from({ length: currentYear - 1979 + 1 }, (_, i) => currentYear - i)
        , [currentYear]);

    return (
        <aside className="w-full md:w-64 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex-shrink-0 h-fit">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">필터</h2>

            <button
                onClick={handleQuickMatchClick}
                className="w-full p-3 mb-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
            >
                30초 영화 퀵매칭 시작
            </button>

            <button
                onClick={handleResetFilters}
                className="w-full p-3 mb-6 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
                필터 초기화
            </button>

            {/* 장르 필터 */}
            <div className="mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-white">장르</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {genres.map(genre => (
                        <div key={genre.id} className="flex items-center">
                            <input
                                type="checkbox"
                                id={`genre-${genre.id}`}
                                checked={selectedGenres.includes(genre.id)}
                                onChange={() => handleGenreChange(genre.id)}
                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                            />
                            <label
                                htmlFor={`genre-${genre.id}`}
                                className="text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-500 transition-colors"
                            >
                                {genre.name}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            {/* 개봉 연도 필터 */}
            <div className="mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-white">개봉 연도</h3>
                <select
                    value={selectedYear}
                    onChange={e => handleYearChange(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                    <option value="">전체</option>
                    {years.map(year => (
                        <option key={year} value={year}>
                            {year}년
                        </option>
                    ))}
                </select>
            </div>

            {/* 최소 평점 필터 */}
            <div className="mb-4">
                <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-white">
                    최소 평점:{' '}
                    <span className="font-bold text-blue-500">{minRating.toFixed(1)}</span>
                </h3>
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
    );
};
// ======================================================================


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
    const [favoriteMovieIds, setFavoriteMovieIds] = useState<Set<string>>(new Set());
    const [watchlistMovieIds, setWatchlistMovieIds] = useState<Set<string>>(new Set());

    const navigate = useNavigate();
    const handleQuickMatchClick = () => {
        navigate('/quickmatch');
    };

    const setMoviesAndResetPage = useCallback((newMovies: Movie[]) => {
        setCurrentPage(1);
        setMovies(newMovies);
    }, []);

    // Intersection Observer 로직
    const observer = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useCallback(
        (node: HTMLDivElement) => {
            if (loading || loadingMore || currentPage >= totalPages) return;
            if (observer.current) observer.current.disconnect();
            observer.current = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting) {
                    setCurrentPage(prevPage => prevPage + 1);
                }
            });
            if (node) observer.current.observe(node);
        },
        [loading, loadingMore, currentPage, totalPages]
    );

    // 사용자 데이터 (찜하기/워치리스트) 패치
    const fetchUserData = useCallback(async () => {
        if (isLoggedIn) {
            try {
                const response = await axiosInstance.get<UserProfile>('/user/profile');
                setFavoriteMovieIds(new Set(response.data.favoriteMovieIds || []));
                setWatchlistMovieIds(
                    new Set(response.data.watchlistMovies?.map(item => String(item.movieId)) || [])
                );
            } catch (err) {
                console.error('사용자 데이터를 불러오는데 실패했습니다.', err);
            }
        } else {
            setFavoriteMovieIds(new Set());
            setWatchlistMovieIds(new Set());
        }
    }, [isLoggedIn]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    // 장르 옵션 패치
    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const response = await fetch(
                    `${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=ko-KR`
                );
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                setGenres(data.genres);
            } catch (err) {
                console.error('필터 옵션을 가져오는데 실패했습니다.', err);
            }
        };
        fetchFilterOptions();
    }, []);

    // 영화 목록 패치 (필터/페이지 변경 시)
    useEffect(() => {
        const fetchMovies = async () => {
            if (currentPage === 1) setLoading(true);
            else setLoadingMore(true);
            setError(null);

            let apiUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=ko-KR&sort_by=popularity.desc&page=${currentPage}`;

            if (selectedGenres.length > 0) apiUrl += `&with_genres=${selectedGenres.join(',')}`;
            if (selectedYear) apiUrl += `&primary_release_year=${selectedYear}`;
            if (minRating > 0) apiUrl += `&vote_average.gte=${minRating}`;

            try {
                const response = await fetch(apiUrl);
                if (!response.ok) throw new Error('Network response was not ok');
                const data: ApiResult = await response.json();

                // TMDB ID가 숫자인 경우를 대비해 String으로 변환 (MovieCard에서 string으로 받으므로)
                const stringIdMovies = data.results.map(movie => ({ ...movie, id: String(movie.id) }));

                setMovies(prev => (currentPage === 1 ? stringIdMovies : [...prev, ...stringIdMovies]));
                setTotalPages(data.total_pages);
            } catch (e) {
                setError(e as Error);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        };
        fetchMovies();
    }, [selectedGenres, selectedYear, minRating, currentPage]); // 필터 및 페이지 상태가 변경될 때마다 실행

    // --- 핸들러 함수들 ---

    const handleToggleFavorite = async (movieId: string) => {
        if (!isLoggedIn) {
            alert('로그인이 필요합니다.');
            return;
        }

        const originalFavorites = new Set(favoriteMovieIds);
        const isAdding = !favoriteMovieIds.has(movieId);

        // UI 낙관적 업데이트
        const newFavoriteIds = new Set(favoriteMovieIds);
        if (isAdding) {
            newFavoriteIds.add(movieId);
        } else {
            newFavoriteIds.delete(movieId);
        }
        setFavoriteMovieIds(newFavoriteIds);

        try {
            await axiosInstance.post(`/favorites/toggle/${movieId}`);
        } catch (err) {
            console.error('찜 상태 변경에 실패했습니다.', err);
            // 실패 시 롤백
            setFavoriteMovieIds(originalFavorites);
            alert('찜 상태 변경에 실패했습니다. 다시 시도해주세요.');
        }
    };

    const handleToggleWatchlist = async (movieId: string) => {
        if (!isLoggedIn) {
            alert('로그인이 필요합니다.');
            return;
        }

        const originalWatchlist = new Set(watchlistMovieIds);
        const isAdding = !watchlistMovieIds.has(movieId);

        // UI 낙관적 업데이트
        const newWatchlistIds = new Set(watchlistMovieIds);
        if (isAdding) {
            newWatchlistIds.add(movieId);
        } else {
            newWatchlistIds.delete(movieId);
        }
        setWatchlistMovieIds(newWatchlistIds);

        try {
            // API 엔드포인트 수정: 워치리스트는 토글 엔드포인트를 사용한다고 가정
            await axiosInstance.post(`/watchlist/toggle/${movieId}`);
        } catch (err) {
            console.error('워치리스트 상태 변경에 실패했습니다.', err);
            // 실패 시 롤백
            setWatchlistMovieIds(originalWatchlist);
            alert('워치리스트 상태 변경에 실패했습니다. 다시 시도해주세요.');
        }
    };

    // --- 필터 변경 핸들러 ---

    // 모든 필터 변경 함수는 setMoviesAndResetPage를 사용하여 상태를 리셋합니다.
    const handleGenreChange = (genreId: number) => {
        setSelectedGenres(prev => {
            const newGenres = prev.includes(genreId)
                ? prev.filter(id => id !== genreId)
                : [...prev, genreId];

            // 상태 변경 후, 페이지 리셋 및 영화 목록 초기화
            setMoviesAndResetPage([]);
            return newGenres;
        });
    };

    const handleYearChange = (year: string) => {
        setMoviesAndResetPage([]);
        setSelectedYear(year);
    };

    const handleRatingChange = (rating: number) => {
        setMoviesAndResetPage([]);
        setMinRating(rating);
    };

    const handleResetFilters = () => {
        const isFilterApplied = selectedGenres.length > 0 || selectedYear !== '' || minRating !== 0;

        setSelectedGenres([]);
        setSelectedYear('');
        setMinRating(0);

        if (isFilterApplied) {
            // 필터가 적용되어 있었다면 목록을 초기화하고 페이지를 1로 설정하여 새 목록을 패치합니다.
            setMoviesAndResetPage([]);
        }
    };


    if (error) {
        return (
            <div className="text-center p-12 text-2xl text-red-500 dark:text-red-400">
                에러가 발생했습니다: {error.message}
            </div>
        );
    }

    // --- 렌더링 시작 ---

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white">
            <MovieCarousel />

            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* 섹션 캐러셀 영역 */}
                <MovieSectionCarousel
                    title="인기 영화"
                    fetchUrl={`${TMDB_BASE_URL}/movie/popular`}
                    onToggleFavorite={handleToggleFavorite}
                    favoriteMovieIds={favoriteMovieIds}
                    showWatchlistControls={false}
                />
                <MovieSectionCarousel
                    title="높은 평점 영화"
                    fetchUrl={`${TMDB_BASE_URL}/movie/top_rated`}
                    onToggleFavorite={handleToggleFavorite}
                    favoriteMovieIds={favoriteMovieIds}
                    showWatchlistControls={false}
                />
                <MovieSectionCarousel
                    title="개봉 예정 영화"
                    fetchUrl={`${TMDB_BASE_URL}/movie/upcoming`}
                    onToggleFavorite={handleToggleFavorite}
                    favoriteMovieIds={favoriteMovieIds}
                    showWatchlistControls={false}
                />

                <div className="flex flex-col md:flex-row gap-8 mt-12">

                    {/* 1. 필터 사이드바 (분리된 컴포넌트 사용) */}
                    <FilterSidebar
                        genres={genres}
                        selectedGenres={selectedGenres}
                        selectedYear={selectedYear}
                        minRating={minRating}
                        handleGenreChange={handleGenreChange}
                        handleYearChange={handleYearChange}
                        handleRatingChange={handleRatingChange}
                        handleResetFilters={handleResetFilters}
                        handleQuickMatchClick={handleQuickMatchClick}
                    />

                    {/* 2. 메인 영화 목록 */}
                    <main className="flex-1 min-w-0">
                        <h1 className="text-4xl font-extrabold text-center mb-8 text-gray-800 dark:text-white">
                            영화 목록
                        </h1>

                        {/* 로딩 스켈레톤 (첫 페이지) */}
                        {loading && currentPage === 1 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                                {Array.from({ length: 10 }).map((_, index) => (
                                    <MovieCardSkeleton key={index} staggerIndex={index} />
                                ))}
                            </div>
                        ) : (
                            <>
                                {/* 영화 목록 렌더링 */}
                                {movies.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                                        {movies.map((movie, index) => (
                                            <MovieCard
                                                key={movie.id}
                                                id={movie.id}
                                                title={movie.title}
                                                posterUrl={
                                                    movie.poster_path
                                                        ? `${IMAGE_BASE_URL}${movie.poster_path}`
                                                        : NO_IMAGE_URL
                                                }
                                                isFavorite={favoriteMovieIds.has(movie.id)}
                                                onToggleFavorite={handleToggleFavorite}
                                                isWatched={watchlistMovieIds.has(movie.id)}
                                                onToggleWatched={handleToggleWatchlist}
                                                staggerIndex={index}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    // 영화가 없는 경우
                                    !loading && (
                                        <p className="mt-8 text-gray-800 dark:text-white text-center text-xl">
                                            선택한 조건에 맞는 영화가 없습니다.
                                        </p>
                                    )
                                )}

                                {/* 추가 로딩 스켈레톤 (무한 스크롤) */}
                                {loadingMore && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10 mt-10">
                                        {Array.from({ length: 5 }).map((_, index) => (
                                            <MovieCardSkeleton
                                                key={`loading-more-${index}`}
                                                staggerIndex={index}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Intersection Observer 타겟 */}
                                <div
                                    ref={loadMoreRef}
                                    style={{ height: '20px', margin: '20px 0' }}
                                    // 페이지 끝에 도달했거나 에러 상태일 때는 보이지 않게 처리
                                    className={currentPage < totalPages ? '' : 'hidden'}
                                />
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default MainPage;