import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // axiosInstance 대신 일반 axios 사용
import axiosInstance from '../api/axiosInstance';
import MovieCard from '../components/MovieCard';
import StarRating from '../components/StarRating';
import MovieCardSkeleton from '../components/MovieCardSkeleton';

// ... (인터페이스 정의는 이전과 동일) ...

interface UserProfile {
    id: number;
    email: string;
    name: string;
    role: string;
    favoriteMovieIds: string[];
    ratedMovies: { [movieId: string]: number };
    reviews: Review[];
    watchlistMovies: WatchlistMovie[];
}

interface WatchlistMovie {
    movieId: string;
    watched: boolean;
}

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

interface MovieSummary {
    id: string;
    title: string;
    poster_path: string;
    vote_average: number;
    watched?: boolean;
}

interface Booking {
  bookingId: number;
  bookingStatus: string;
  seats: string[];
  seatCount: number;
  totalPrice: number;
  createdAt: string;
  userId: number;
  userName: string;
  userEmail: string;
  showtimeId: number;
  startTime: string;
  endTime: string;
  movieId: string;
  movieTitle: string;
  posterPath: string;
  runtime: number;
  theaterId: number;
  theaterName: string;
  theaterChain: string;
  theaterAddress: string;
  screenId: number;
  screenName: string;
  screenType: string;
}


const MyPage: React.FC = () => {
    const { userEmail, isLoggedIn } = useAuth();
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);

    const [favoriteMoviesDetails, setFavoriteMoviesDetails] = useState<MovieSummary[]>([]);
    const [watchlistMoviesDetails, setWatchlistMoviesDetails] = useState<MovieSummary[]>([]);
    const [ratedMoviesDetails, setRatedMoviesDetails] = useState<MovieSummary[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);

    const tmdbApiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb'; // TMDB API 키

    useEffect(() => {
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }

        const fetchUserProfileAndMovies = async () => {
            setLoading(true);
            try {
                const profileResponse = await axiosInstance.get<UserProfile>('/user/profile');
                setProfile(profileResponse.data);
                const fetchedProfile = profileResponse.data;

                // TMDB API를 사용하여 영화 상세 정보 가져오기
                const fetchMovieDetailsFromTmdb = async (movieIds: string[]): Promise<MovieSummary[]> => {
                    if (movieIds.length === 0) return [];
                    const movieDetailsPromises = movieIds.map(id =>
                        axios.get(`https://api.themoviedb.org/3/movie/${id}?api_key=${tmdbApiKey}&language=ko-KR`)
                            .then(res => ({
                                id: res.data.id.toString(),
                                title: res.data.title,
                                poster_path: res.data.poster_path,
                                vote_average: res.data.vote_average
                            }))
                            .catch(err => {
                                console.error(`TMDB에서 영화 상세 정보를 가져오는데 실패했습니다. ID: ${id}:`, err);
                                return null;
                            })
                    );
                    const details = (await Promise.all(movieDetailsPromises)).filter(Boolean) as MovieSummary[];
                    return details;
                };

                const favDetails = await fetchMovieDetailsFromTmdb(fetchedProfile.favoriteMovieIds || []);
                setFavoriteMoviesDetails(favDetails);

                const watchlistMovieIds = fetchedProfile.watchlistMovies?.map(item => item.movieId) || [];
                const watchDetails = await fetchMovieDetailsFromTmdb(watchlistMovieIds);
                const watchDetailsWithWatched = watchDetails.map(movie => ({
                    ...movie,
                    watched: fetchedProfile.watchlistMovies?.find(item => item.movieId === movie.id)?.watched || false
                }));
                setWatchlistMoviesDetails(watchDetailsWithWatched);

                const ratedDetails = await fetchMovieDetailsFromTmdb(Object.keys(fetchedProfile.ratedMovies || {}));
                setRatedMoviesDetails(ratedDetails);

                if (fetchedProfile.id) {
                    try {
                        const bookingsResponse = await axiosInstance.get<Booking[]>(`/bookings/user/${fetchedProfile.id}`);
                        setBookings(bookingsResponse.data || []);
                    } catch (err: any) {
                        console.error("예매 내역을 불러오는데 실패했습니다.", err);
                        setBookings([]);
                    }
                }

            } catch (err) {
                console.error("사용자 프로필 및 영화 목록을 불러오는데 실패했습니다.", err);
                setPageError("프로필 정보를 불러오는 데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfileAndMovies();
    }, [isLoggedIn, navigate]);

    const handleToggleFavorite = async (movieId: string) => {
        try {
            await axiosInstance.post(`/favorites/toggle/${movieId}`);
            setFavoriteMoviesDetails(prev => prev.filter(movie => movie.id !== movieId));
        } catch (err) {
            console.error(`Failed to toggle favorite status for movie ${movieId}:`, err);
            alert('찜 상태 변경에 실패했습니다.');
        }
    };

    const handleToggleWatched = async (movieId: string) => {
        try {
            const response = await axiosInstance.patch<boolean>(`/watchlist/${movieId}/watched`);
            setWatchlistMoviesDetails(prevDetails =>
                prevDetails.map(movie =>
                    movie.id === movieId ? { ...movie, watched: response.data } : movie
                )
            );
            alert(response.data ? '시청 완료로 표시되었습니다.' : '시청 예정으로 표시되었습니다.');
        } catch (err) {
            console.error(`Failed to toggle watched status for movie ${movieId}:`, err);
            alert('시청 상태 변경에 실패했습니다.');
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword !== confirmPassword) {
            setError('새 비밀번호가 일치하지 않습니다.');
            return;
        }

        try {
            const response = await axiosInstance.patch('/user/password', { currentPassword, newPassword });
            setSuccess(response.data);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            const errorMessage = err.response?.data || err.message || '비밀번호 변경에 실패했습니다.';
            setError(errorMessage);
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm('정말 회원 탈퇴를 진행하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            try {
                await axiosInstance.delete('/user');
                alert('회원 탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.');
                localStorage.removeItem('accessToken');
                window.location.href = '/';
            } catch (error) {
                console.error('회원 탈퇴 실패:', error);
                alert('회원 탈퇴 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
        }
    };
    
    // ... (로딩 및 에러 처리 UI는 이전과 동일) ...

    if (!isLoggedIn) {
        return <div className="text-center p-12 text-2xl text-red-500">로그인이 필요합니다.</div>;
    }

    if (pageError) {
        return <div className="text-center p-12 text-2xl text-red-500">{pageError}</div>;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
                {/* 스켈레톤 UI */}
            </div>
        );
    }

    if (!profile) {
        return <div className="text-center p-12 text-2xl dark:text-white">프로필 정보를 찾을 수 없습니다.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
                <h1 className="text-4xl font-bold mb-8 text-center"> 내 프로필</h1>

                <div className="flex justify-center mb-8">
                    <button
                        onClick={() => navigate('/recap')}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <span>🎬</span> 2025 영화 여정 보기
                    </button>
                </div>

                <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h2 className="text-2xl font-semibold mb-4">예매 내역 ({bookings.length})</h2>
                    {bookings.length === 0 ? (
                        <p className="text-gray-600 dark:text-gray-400">예매 내역이 없습니다.</p>
                    ) : (
                        <div className="space-y-4">
                            {bookings.map((booking) => (
                                <div key={booking.bookingId} className="bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md p-5 border border-gray-200 dark:border-gray-600">
                                    {/* ... 예매 내역 상세 ... */}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h2 className="text-2xl font-semibold mb-4">찜한 영화 ({favoriteMoviesDetails.length})</h2>
                    {favoriteMoviesDetails.length === 0 ? (
                        <p className="text-gray-600 dark:text-gray-400">찜한 영화가 없습니다.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                            {favoriteMoviesDetails.map((movie, index) => (
                                <MovieCard
                                    key={movie.id}
                                    id={movie.id}
                                    title={movie.title}
                                    posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'}
                                    isFavorite={true}
                                    onToggleFavorite={() => handleToggleFavorite(movie.id)}
                                    size="sm"
                                    staggerIndex={index}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h2 className="text-2xl font-semibold mb-4">보고싶어요 ({watchlistMoviesDetails.length})</h2>
                    {watchlistMoviesDetails.length === 0 ? (
                        <p className="text-gray-600 dark:text-gray-400">보고싶어요 목록에 영화가 없습니다.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                            {watchlistMoviesDetails.map((movie, index) => (
                                <div key={movie.id}>
                                    <MovieCard
                                        id={movie.id}
                                        title={movie.title}
                                        posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'}
                                        isWatched={movie.watched || false}
                                        showWatchlistControls={true}
                                        onToggleWatched={() => handleToggleWatched(movie.id)}
                                        size="sm"
                                        staggerIndex={index}
                                    />
                                    <div>
                                        <h3 className="text-xl font-semibold">{movie.title}</h3>
                                        <StarRating rating={profile?.ratedMovies[movie.id] || 0} readOnly={true} size="md" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mb-10">
                    <h2 className="text-2xl font-semibold mb-4">작성한 리뷰 ({profile?.reviews.length || 0})</h2>
                    {(profile?.reviews.length || 0) === 0 ? (
                        <p className="text-gray-600 dark:text-gray-400">작성한 리뷰가 없습니다.</p>
                    ) : (
                        <div className="space-y-6">
                            {profile?.reviews.map(review => (
                                <div key={review.id} className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-lg">
                                            {ratedMoviesDetails.find(m => m.id === review.movieId)?.title ??
                                             watchlistMoviesDetails.find(m => m.id === review.movieId)?.title ??
                                             favoriteMoviesDetails.find(m => m.id === review.movieId)?.title ??
                                             `영화 ID: ${review.movieId}`}
                                        </h3>
                                        <span className="ml-3 text-yellow-500 flex items-center">
                                            {'⭐'.repeat(review.rating)}
                                            <span className="ml-1 text-gray-700 dark:text-gray-300 text-sm">({review.rating}/5)</span>
                                        </span>
                                    </div>
                                    <p className="text-gray-800 dark:text-gray-200 leading-relaxed mb-2">{review.comment}</p>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        작성일: {new Date(review.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 계정 관리 */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-10">
                    <h2 className="text-2xl font-semibold mb-4">계정 관리</h2>
                    <p className="text-lg mb-6"><strong>이메일:</strong> {userEmail}</p>

                    <div className="border-t pt-6 border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-semibold mb-4">비밀번호 변경</h2>
                        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                        {success && <p className="text-green-500 text-center mb-4">{success}</p>}
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="currentPassword">현재 비밀번호</label>
                                <input type="password" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="newPassword">새 비밀번호</label>
                                <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="confirmPassword">새 비밀번호 확인</label>
                                <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500" />
                            </div>
                            <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">비밀번호 변경</button>
                        </form>
                    </div>

                    <div className="mt-8 border-t pt-6 border-red-300 dark:border-red-700">
                        <h2 className="text-2xl font-semibold mb-4 text-red-500">계정 삭제</h2>
                        <button onClick={handleDeleteAccount} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">회원 탈퇴</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyPage;
