import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import axiosInstance from '../api/axiosInstance';
import MovieCard from '../components/MovieCard';
import StarRating from '../components/StarRating';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import MovieSectionCarousel from '../components/MovieSectionCarousel'; // MovieSectionCarousel 임포트 추가
import type { AxiosResponse } from 'axios'; // 👈 여기를 'import type'으로 수정!

// ... 나머지 인터페이스 정의 및 컴포넌트 로직 ...

// TMDB 설정 상수화
const TMDB_API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3/movie/';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const NO_IMAGE_URL = 'https://via.placeholder.com/200x300?text=No+Image';

// --- 인터페이스 정의 (중복 방지를 위해 그대로 유지) ---
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
// --- 인터페이스 끝 ---

// 분리된 컴포넌트들을 임시로 이 파일에 정의했다고 가정합니다.
// 실제 프로젝트에서는 위에서 제안한 대로 별도 파일로 분리해야 합니다.
const BookingItem: React.FC<{ booking: Booking; onCancel?: () => void }> = ({ booking, onCancel }) => {
    const [loading, setLoading] = React.useState(false);
    const posterUrl = booking.posterPath ? `${IMAGE_BASE_URL}${booking.posterPath}` : NO_IMAGE_URL.replace('200x300', '100x150');

    const statusClasses = {
        'CONFIRMED': 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200',
        'PENDING': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200',
        'CANCELLED': 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200',
    };
    const statusClass = statusClasses[booking.bookingStatus as keyof typeof statusClasses] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

    // 예매 취소 핸들러
    const handleCancel = async () => {
        if (!window.confirm('정말 이 예매를 취소하시겠습니까?')) return;
        setLoading(true);
        try {
            await axiosInstance.delete(`/bookings/${booking.bookingId}`);
            alert('예매가 취소되었습니다.');
            if (onCancel) onCancel();
        } catch (err: any) {
            alert(err?.response?.data?.message || '예매 취소에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex space-x-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md p-5 border border-gray-200 dark:border-gray-600 transition-shadow hover:shadow-lg">
            <img src={posterUrl} alt={`${booking.movieTitle} 포스터`} className="w-16 h-24 object-cover rounded-md flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold truncate text-gray-900 dark:text-white">{booking.movieTitle}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusClass}`}>
                        {booking.bookingStatus === 'CONFIRMED' ? '예매 완료' : booking.bookingStatus === 'CANCELLED' ? '취소됨' : '처리 중'}
                    </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold">{new Date(booking.startTime).toLocaleString()}</span>
                </p>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-0.5 mt-2">
                    <li><strong className='font-bold'>극장:</strong> {booking.theaterName} ({booking.screenName})</li>
                    <li><strong className='font-bold'>좌석:</strong> {booking.seats.join(', ')} ({booking.seatCount}석)</li>
                    <li><strong className='font-bold'>총 금액:</strong> {booking.totalPrice.toLocaleString()}원</li>
                </ul>
                {/* 예매 취소 버튼 */}
                {booking.bookingStatus === 'CONFIRMED' && (
                    <button
                        className="mt-3 bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 px-4 rounded transition-colors disabled:opacity-60"
                        onClick={handleCancel}
                        disabled={loading}
                    >
                        {loading ? '취소 중...' : '예매 취소'}
                    </button>
                )}
            </div>
        </div>
    );
};

// MovieSection 및 ReviewList 컴포넌트도 위에서처럼 정의되었다고 가정하고 MainPage에 적용합니다.

// ReviewList.tsx (별도 파일로 분리)
interface ReviewListProps {
    reviews: Review[];
    movieDetails: MovieSummary[];
}

const ReviewList: React.FC<ReviewListProps> = ({ reviews, movieDetails }) => {
    return (
        <div className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">작성한 리뷰 ({reviews?.length || 0})</h2>
            {(reviews?.length || 0) === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">작성한 리뷰가 없습니다.</p>
            ) : (
                <div className="space-y-6">
                    {reviews.map(review => {
                        const movieTitle = movieDetails.find(m => m.id === review.movieId)?.title ?? `영화 ID: ${review.movieId}`;

                        return (
                            <div key={review.id} className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{movieTitle}</h3>
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
                                </div>
                                <p className="text-gray-800 dark:text-gray-200 leading-relaxed mb-2">{review.comment}</p>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    작성일: {new Date(review.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// PasswordChangeForm.tsx (별도 파일로 분리)
interface PasswordChangeFormProps {
    error: string | null;
    success: string | null;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    setCurrentPassword: (pw: string) => void;
    setNewPassword: (pw: string) => void;
    setConfirmPassword: (pw: string) => void;
    handleChangePassword: (e: React.FormEvent) => void;
    handleDeleteAccount: () => void;
    userEmail: string;
}

const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({
                                                                   error, success, currentPassword, newPassword, confirmPassword,
                                                                   setCurrentPassword, setNewPassword, setConfirmPassword,
                                                                   handleChangePassword, handleDeleteAccount, userEmail
                                                               }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-10">
        <h2 className="text-2xl font-semibold mb-4">계정 관리</h2>
        <p className="text-lg mb-6"><strong className='font-bold'>이메일:</strong> {userEmail}</p>

        <div className="border-t pt-6 border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">비밀번호 변경</h2>
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            {success && <p className="text-green-500 text-center mb-4">{success}</p>}
            <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="currentPassword">현재 비밀번호</label>
                    <input type="password" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="newPassword">새 비밀번호</label>
                    <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="confirmPassword">새 비밀번호 확인</label>
                    <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">비밀번호 변경</button>
            </form>
        </div>

        <div className="mt-8 border-t pt-6 border-red-300 dark:border-red-700">
            <h2 className="text-2xl font-semibold mb-4 text-red-500">계정 삭제</h2>
            <button onClick={handleDeleteAccount} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">회원 탈퇴</button>
        </div>
    </div>
);


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

    // 모든 관심 영화 ID 목록을 합쳐서 TMDB 호출을 최적화합니다.
    const allRelevantMovieIds = useMemo(() => {
        const ids = new Set<string>();
        if (profile) {
            profile.favoriteMovieIds?.forEach(id => ids.add(id));
            profile.watchlistMovies?.forEach(item => ids.add(item.movieId));
            Object.keys(profile.ratedMovies || {})?.forEach(id => ids.add(id));
        }
        return Array.from(ids);
    }, [profile]);

    // TMDB API에서 영화 상세 정보 목록을 한 번에 가져오는 함수
    const fetchMovieDetailsFromTmdb = useCallback(async (movieIds: string[]): Promise<MovieSummary[]> => {
        if (!movieIds || movieIds.length === 0) return [];

        const movieDetailsPromises = movieIds.map(id =>
            axios.get(`${TMDB_BASE_URL}${id}?api_key=${TMDB_API_KEY}&language=ko-KR`)
                .then((res: AxiosResponse) => ({
                    id: String(res.data.id),
                    title: res.data.title,
                    poster_path: res.data.poster_path,
                    vote_average: res.data.vote_average
                }))
                // 실패해도 Promise.allSettled를 통해 다음 영화 처리가 가능하도록 처리
                .catch(err => {
                    console.error(`TMDB에서 영화 상세 정보를 가져오는데 실패했습니다. ID: ${id}:`, err);
                    return null;
                })
        );

        // Promise.all 대신 Promise.allSettled를 사용하여 실패한 API 호출이 전체를 중단시키지 않도록 합니다.
        const results = await Promise.allSettled(movieDetailsPromises);

        const details = results
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => (result as PromiseFulfilledResult<MovieSummary>).value)
            .filter(Boolean) as MovieSummary[]; // 타입 가드

        return details;
    }, []);

    // 예매 내역만 새로고침하는 함수 (BookingItem에서 onCancel로 사용)
    const fetchBookings = useCallback(async () => {
        if (!profile) return;
        try {
            const bookingsResponse = await axiosInstance.get<Booking[]>(`/bookings/user/${profile.id}`);
            setBookings(bookingsResponse.data || []);
        } catch (err) {
            // 무시 또는 에러 처리
        }
    }, [profile]);

    useEffect(() => {
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }

        const fetchUserProfileAndMovies = async () => {
            setLoading(true);
            setPageError(null);

            try {
                // 1. 프로필 정보 가져오기
                const profileResponse = await axiosInstance.get<UserProfile>('/user/profile');
                const fetchedProfile = profileResponse.data;
                setProfile(fetchedProfile);

                // 2. 예매 내역 가져오기
                const bookingsResponse = await axiosInstance.get<Booking[]>(`/bookings/user/${fetchedProfile.id}`);
                setBookings(bookingsResponse.data || []);

                // 3. 모든 관련 영화 ID 추출 및 TMDB 상세 정보 일괄 패치
                const allIds = [
                    ...fetchedProfile.favoriteMovieIds,
                    ...(fetchedProfile.watchlistMovies?.map(item => item.movieId) || []),
                    ...Object.keys(fetchedProfile.ratedMovies || {})
                ];
                const uniqueIds = Array.from(new Set(allIds));
                const allDetails = await fetchMovieDetailsFromTmdb(uniqueIds);

                // 4. TMDB 결과와 사용자 데이터 병합

                // 찜한 영화
                const favDetails = allDetails.filter(movie => fetchedProfile.favoriteMovieIds.includes(movie.id));
                setFavoriteMoviesDetails(favDetails);

                // 보고싶어요 (시청 여부 포함)
                const watchlistMovieMap = new Map(fetchedProfile.watchlistMovies?.map(item => [item.movieId, item.watched]) || []);
                const watchDetailsWithWatched = allDetails
                    .filter(movie => watchlistMovieMap.has(movie.id))
                    .map(movie => ({
                        ...movie,
                        watched: watchlistMovieMap.get(movie.id) || false
                    }));
                setWatchlistMoviesDetails(watchDetailsWithWatched);

                // 평점 준 영화 (이미 위 목록에 포함되므로 따로 렌더링에 사용하지 않고 데이터만 보존)
                setRatedMoviesDetails(allDetails.filter(movie => Object.keys(fetchedProfile.ratedMovies || {}).includes(movie.id)));


            } catch (err: any) {
                console.error("사용자 프로필 및 영화 목록을 불러오는데 실패했습니다.", err);
                setPageError("프로필 정보를 불러오는 데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfileAndMovies();
    }, [isLoggedIn, navigate, fetchMovieDetailsFromTmdb]); // fetchMovieDetailsFromTmdb를 종속성 배열에 추가

    // --- 핸들러 함수들 (기존 로직 유지) ---
    const handleToggleFavorite = async (movieId: string) => {
        try {
            await axiosInstance.post(`/favorites/toggle/${movieId}`);
            // UI 업데이트: 목록에서 제거
            setFavoriteMoviesDetails(prev => prev.filter(movie => movie.id !== movieId));
        } catch (err) {
            console.error(`Failed to toggle favorite status for movie ${movieId}:`, err);
            alert('찜 상태 변경에 실패했습니다.');
        }
    };

    const handleToggleWatched = async (movieId: string) => {
        try {
            const response = await axiosInstance.patch<boolean>(`/watchlist/${movieId}/watched`);
            // UI 업데이트: 시청 상태 토글
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
        if (!currentPassword || !newPassword) {
            setError('모든 비밀번호 필드를 채워주세요.');
            return;
        }

        try {
            const response = await axiosInstance.patch('/user/password', { currentPassword, newPassword });
            setSuccess(response.data.message || '비밀번호가 성공적으로 변경되었습니다.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.response?.data || err.message || '비밀번호 변경에 실패했습니다.';
            setError(errorMessage);
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm('정말 회원 탈퇴를 진행하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            try {
                await axiosInstance.delete('/user');
                alert('회원 탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.');
                // 인증 상태 초기화 및 리다이렉트 (AuthContext의 로그아웃 함수를 사용하는 것이 더 안전)
                localStorage.removeItem('accessToken');
                window.location.href = '/';
            } catch (error) {
                console.error('회원 탈퇴 실패:', error);
                alert('회원 탈퇴 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
        }
    };

    // --- 조건부 렌더링 ---

    if (!isLoggedIn) {
        return <div className="text-center p-12 text-2xl text-red-500">로그인이 필요합니다.</div>;
    }

    if (pageError) {
        return <div className="text-center p-12 text-2xl text-red-500">{pageError}</div>;
    }

    if (loading || !profile) {
        // 더 나은 스켈레톤 UI를 위해 MovieCardSkeleton을 활용할 수 있습니다.
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
                <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mx-auto mb-10"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        <div className="grid grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 렌더링에 필요한 모든 영화 상세 정보를 통합
    const allMovieDetails = [...favoriteMoviesDetails, ...watchlistMoviesDetails, ...ratedMoviesDetails];
    const uniqueMovieDetails = Array.from(new Set(allMovieDetails.map(m => m.id)))
        .map(id => allMovieDetails.find(m => m.id === id))
        .filter(Boolean) as MovieSummary[];

    // --- 최종 렌더링 ---

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
                <h1 className="text-4xl font-bold mb-8 text-center">내 프로필</h1>

                <div className="flex justify-center mb-12">
                    <button
                        onClick={() => navigate('/recap')}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <span>🎬</span> 2025 영화 여정 보기
                    </button>
                </div>

                {/* 예매 내역 섹션 */}
                <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h2 className="text-2xl font-semibold mb-4">예매 내역 ({bookings.filter(booking => booking.bookingStatus !== 'CANCELLED').length || 0})</h2>
                    {(bookings.length || 0) === 0 ? (
                        <p className="text-gray-600 dark:text-gray-400">예매 내역이 없습니다.</p>
                    ) : (
                        <div className="space-y-4">
                            {bookings
                                .filter(booking => booking.bookingStatus !== 'CANCELLED')
                                .map(booking => (
                                    <BookingItem key={booking.bookingId} booking={booking} onCancel={fetchBookings} />
                                ))}
                        </div>
                    )}
                </div>

                {/* 찜한 영화 섹션 */}
                <MovieSectionCarousel
                    title="찜한 영화"
                    movies={favoriteMoviesDetails}
                    loading={loading}
                    onToggleFavorite={handleToggleFavorite}
                />

                {/* 보고싶어요 섹션 */}
                <MovieSectionCarousel
                    title="보고싶어요"
                    movies={watchlistMoviesDetails}
                    loading={loading}
                    onToggleWatched={handleToggleWatched}
                    showWatchlistControls={true}
                    ratedMovies={profile.ratedMovies}
                />

                {/* 작성한 리뷰 섹션 */}
                <ReviewList
                    reviews={profile.reviews}
                    movieDetails={uniqueMovieDetails} // 모든 영화 상세 정보를 전달하여 제목 찾기
                />

                {/* 계정 관리 섹션 */}
                <PasswordChangeForm
                    error={error}
                    success={success}
                    currentPassword={currentPassword}
                    newPassword={newPassword}
                    confirmPassword={confirmPassword}
                    setCurrentPassword={setCurrentPassword}
                    setNewPassword={setNewPassword}
                    setConfirmPassword={setConfirmPassword}
                    handleChangePassword={handleChangePassword}
                    handleDeleteAccount={handleDeleteAccount}
                    userEmail={userEmail}
                />
            </div>
        </div>
    );
};

export default MyPage;