import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MovieCarousel from '../components/MovieCarousel';
import MovieSectionCarousel from '../components/MovieSectionCarousel';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axiosInstance';
import axios from 'axios';
import AppHeader from '../components/AppHeader';

const TMDB_API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';


interface Genre {
    id: number;
    name: string;
}

interface UserProfile {
    favoriteMovieIds: string[];
}

const MainPage: React.FC = () => {
    const { isLoggedIn } = useAuth();
    const [favoriteMovieIds, setFavoriteMovieIds] = useState<Set<string>>(new Set());
    // favoriteMoviesDetails, watchlistMovieIds 상태 제거
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
                setFavoriteMovieIds(new Set(response.data.favoriteMovieIds || []));
            } catch (err) {
                console.error('사용자 데이터를 불러오는데 실패했습니다.', err);
            } finally {
                setLoadingFavorites(false);
            }
        } else {
            setFavoriteMovieIds(new Set());
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
            await axiosInstance.post(`/favorites/${movieId}`);
        } catch (err) {
            setFavoriteMovieIds(new Set(favoriteMovieIds)); // 롤백
            alert('찜 상태 변경에 실패했습니다.');
        }
    };

    return (

        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white overflow-x-hidden">

            <MovieCarousel />
            <AppHeader />
            {/* 퀵매칭 버튼 추가 */}
            <div className="py-12 text-center">
                <button
                    onClick={handleQuickMatchClick}
                    className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all text-xl"
                >
                    🚀 30초 영화 퀵매칭 시작하기
                </button>
            </div>

            {/* 
              [수정] 캐러셀 컨테이너에 max-w-screen-xl와 mx-auto를 추가하여
              전체 섹션의 너비를 제한하고 중앙에 정렬합니다. 이렇게 하면 양옆에 여백이 생깁니다.
            */}
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
                {/* 
                  [수정] 각 MovieSectionCarousel에 maxItems={5} prop을 추가하여
                  내부적으로 5개의 영화만 표시하도록 제한합니다.
                  '내가 찜한 영화'는 movies prop을 직접 잘라서 전달합니다.
                */}
                {/* [수정] 찜한 영화가 하나 이상 있을 때만 캐러셀을 표시합니다. */}
                {isLoggedIn && favoriteMovieIds.size > 0 && (
                    <MovieSectionCarousel
                        key="favorites"
                        title="내가 찜한 영화"
                        // [수정] fetchUrl을 백엔드 API로 지정
                        fetchUrl="/favorites/details"
                        onToggleFavorite={handleToggleFavorite}
                        favoriteMovieIds={favoriteMovieIds}
                        showWatchlistControls={false}
                    />
                )}

                <MovieSectionCarousel
                    key="popular"
                    title="인기 영화"
                    fetchUrl="/movies/popular" // 백엔드 엔드포인트로 변경
                    onToggleFavorite={handleToggleFavorite}
                    favoriteMovieIds={favoriteMovieIds}
                    showWatchlistControls={false}
                />
                <MovieSectionCarousel
                    key="now_playing"
                    title="지금 상영중인 영화"
                    fetchUrl="/movies/now-playing" // 백엔드 엔드포인트로 변경
                    onToggleFavorite={handleToggleFavorite}
                    favoriteMovieIds={favoriteMovieIds}
                    showWatchlistControls={false}
                />
                <MovieSectionCarousel
                    key="top_rated"
                    title="높은 평점 영화"
                    fetchUrl="/movies/top-rated" // 백엔드 엔드포인트로 변경
                    onToggleFavorite={handleToggleFavorite}
                    favoriteMovieIds={favoriteMovieIds}
                    showWatchlistControls={false}
                />
                <MovieSectionCarousel
                    key="upcoming"
                    title="개봉 예정 영화"
                    fetchUrl="/movies/upcoming" // 백엔드 엔드포인트로 변경
                    onToggleFavorite={handleToggleFavorite}
                    favoriteMovieIds={favoriteMovieIds}
                    showWatchlistControls={false}
                />

                {/* 장르별 영화도 5개씩만 표시 */}
                {genres.map(genre => (
                    <MovieSectionCarousel
                        key={genre.id}
                        title={`${genre.name} 영화`}
                        fetchUrl={`/movies/discover?genreId=${genre.id}`} // 백엔드 엔드포인트로 변경
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
