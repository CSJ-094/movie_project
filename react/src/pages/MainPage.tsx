import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MovieCarousel from '../components/MovieCarousel';
import MovieSectionCarousel from '../components/MovieSectionCarousel';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axiosInstance';
import axios from 'axios';

const TMDB_API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface Movie {
    id: string;
    title: string;
    poster_path: string;
}

interface Genre {
    id: number;
    name: string;
}

interface UserProfile {
    favoriteMovieIds: string[];
    watchlistMovies: { movieId: string; watched: boolean }[];
}

const MainPage: React.FC = () => {
    const { isLoggedIn } = useAuth();
    const [favoriteMovieIds, setFavoriteMovieIds] = useState<Set<string>>(new Set());
    const [watchlistMovieIds, setWatchlistMovieIds] = useState<Set<string>>(new Set());
    const [favoriteMoviesDetails, setFavoriteMoviesDetails] = useState<Movie[]>([]);
    const [loadingFavorites, setLoadingFavorites] = useState(true);
    const [genres, setGenres] = useState<Genre[]>([]);

    const navigate = useNavigate();

    // 퀵매칭 버튼 핸들러
    const handleQuickMatchClick = () => {
        navigate('/quickmatch');
    };

    // 장르 목록 가져오기
    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const response = await axios.get(`${TMDB_BASE_URL}/genre/movie/list`, {
                    params: {
                        api_key: TMDB_API_KEY,
                        language: 'ko-KR',
                    },
                });
                setGenres(response.data.genres);
            } catch (error) {
                console.error("장르 목록을 불러오는데 실패했습니다.", error);
            }
        };
        fetchGenres();
    }, []);

    // 사용자 데이터 (찜하기/워치리스트) 패치
    const fetchUserData = useCallback(async () => {
        if (isLoggedIn) {
            try {
                const response = await axiosInstance.get<UserProfile>('/user/profile');
                const fetchedFavoriteMovieIds = new Set(response.data.favoriteMovieIds || []);
                setFavoriteMovieIds(fetchedFavoriteMovieIds);
                setWatchlistMovieIds(
                    new Set(response.data.watchlistMovies?.map(item => String(item.movieId)) || [])
                );

                if (fetchedFavoriteMovieIds.size > 0) {
                    setLoadingFavorites(true);
                    const movieDetailsPromises = Array.from(fetchedFavoriteMovieIds).map(id =>
                        axios.get(`${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=ko-KR`)
                            .then(res => ({
                                id: String(res.data.id),
                                title: res.data.title,
                                poster_path: res.data.poster_path,
                            }))
                            .catch(() => null)
                    );
                    const results = await Promise.all(movieDetailsPromises);
                    setFavoriteMoviesDetails(results.filter(Boolean) as Movie[]);
                } else {
                    setFavoriteMoviesDetails([]);
                }
            } catch (err) {
                console.error('사용자 데이터를 불러오는데 실패했습니다.', err);
            } finally {
                setLoadingFavorites(false);
            }
        } else {
            setFavoriteMovieIds(new Set());
            setWatchlistMovieIds(new Set());
            setFavoriteMoviesDetails([]);
            setLoadingFavorites(false);
        }
    }, [isLoggedIn]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const handleToggleFavorite = async (movieId: string) => {
        if (!isLoggedIn) {
            alert('로그인이 필요합니다.');
            return;
        }
        const newFavoriteIds = new Set(favoriteMovieIds);
        if (newFavoriteIds.has(movieId)) {
            newFavoriteIds.delete(movieId);
        } else {
            newFavoriteIds.add(movieId);
        }
        setFavoriteMovieIds(newFavoriteIds);
        try {
            await axiosInstance.post(`/favorites/toggle/${movieId}`);
        } catch (err) {
            setFavoriteMovieIds(new Set(favoriteMovieIds)); // 롤백
            alert('찜 상태 변경에 실패했습니다.');
        }
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white overflow-x-hidden">
            <MovieCarousel />

            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* 퀵매칭 버튼 추가 */}
                <div className="mb-12 text-center">
                    <button
                        onClick={handleQuickMatchClick}
                        className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all text-xl"
                    >
                        🚀 30초 영화 퀵매칭 시작하기
                    </button>
                </div>

                {isLoggedIn && (
                    <MovieSectionCarousel
                        key="favorites"
                        title="내가 찜한 영화"
                        movies={favoriteMoviesDetails}
                        loading={loadingFavorites}
                        onToggleFavorite={handleToggleFavorite}
                        favoriteMovieIds={favoriteMovieIds}
                        showWatchlistControls={false}
                    />
                )}

                <MovieSectionCarousel
                    key="popular"
                    title="인기 영화"
                    fetchUrl={`${TMDB_BASE_URL}/movie/popular`}
                    onToggleFavorite={handleToggleFavorite}
                    favoriteMovieIds={favoriteMovieIds}
                    showWatchlistControls={false}
                />
                <MovieSectionCarousel
                    key="now_playing"
                    title="지금 상영중인 영화"
                    fetchUrl={`${TMDB_BASE_URL}/movie/now_playing`}
                    onToggleFavorite={handleToggleFavorite}
                    favoriteMovieIds={favoriteMovieIds}
                    showWatchlistControls={false}
                />
                <MovieSectionCarousel
                    key="top_rated"
                    title="높은 평점 영화"
                    fetchUrl={`${TMDB_BASE_URL}/movie/top_rated`}
                    onToggleFavorite={handleToggleFavorite}
                    favoriteMovieIds={favoriteMovieIds}
                    showWatchlistControls={false}
                />
                <MovieSectionCarousel
                    key="upcoming"
                    title="개봉 예정 영화"
                    fetchUrl={`${TMDB_BASE_URL}/movie/upcoming`}
                    onToggleFavorite={handleToggleFavorite}
                    favoriteMovieIds={favoriteMovieIds}
                    showWatchlistControls={false}
                />
                
                {/* 모든 장르를 동적으로 렌더링 */}
                {genres.map(genre => (
                    <MovieSectionCarousel
                        key={genre.id}
                        title={`${genre.name} 영화`}
                        fetchUrl={`${TMDB_BASE_URL}/discover/movie?with_genres=${genre.id}`}
                        onToggleFavorite={handleToggleFavorite}
                        favoriteMovieIds={favoriteMovieIds}
                        showWatchlistControls={false}
                    />
                ))}
            </div>
        </div>
    );
};

export default MainPage;
