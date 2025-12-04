import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom'; // Link 추가
import axiosInstance from '../api/axiosInstance';
import MovieCard from '../components/MovieCard';
import StarRating from '../components/StarRating';

// 백엔드 UserProfileDto와 유사한 인터페이스 정의
interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  favoriteMovieIds: string[];
  ratedMovies: { [movieId: string]: number };
  reviews: Review[];
  watchlistMovies: WatchlistMovie[]; // 변경: watchlistMovieIds -> watchlistMovies
}

// WatchlistMovie 인터페이스 추가
interface WatchlistMovie {
  movieId: string;
  watched: boolean;
}

// MovieDetailPage.tsx에서 정의된 Review 인터페이스 재활용
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

// MovieCard에 필요한 영화 상세 정보 (Elasticsearch에서 가져올 예정)
interface MovieSummary {
  id: string;
  title: string;
  poster_path: string;
  vote_average: number;
  watched?: boolean; // watched 필드 추가
}

const MyPage: React.FC = () => {
    const { userEmail, logout, isLoggedIn } = useAuth(); // isLoggedIn 추가
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null); // 페이지 로딩 에러

    // 찜한 영화, Watchlist 영화 등의 상세 정보를 저장할 상태
    const [favoriteMoviesDetails, setFavoriteMoviesDetails] = useState<MovieSummary[]>([]);
    const [watchlistMoviesDetails, setWatchlistMoviesDetails] = useState<MovieSummary[]>([]);
    const [ratedMoviesDetails, setRatedMoviesDetails] = useState<MovieSummary[]>([]);


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

                const fetchMovieDetails = async (movieIds: string[]) => {
                    if (movieIds.length === 0) return [];
                    // 백엔드에 여러 영화 ID를 한 번에 요청하는 API가 없다고 가정하고, 각 ID별로 요청
                    // 실제로는 백엔드에 /api/movies?ids=1,2,3 과 같은 API를 만드는 것이 효율적
                    const movieDetailsPromises = movieIds.map(id =>
                        axiosInstance.get<MovieSummary>(`/movies/${id}`) // MovieSearchController의 getMovieById 사용
                            .then(res => ({
                                id: res.data.id.toString(), // TMDB ID는 숫자지만, 여기서는 string으로 통일
                                title: res.data.title,
                                poster_path: res.data.poster_path,
                                vote_average: res.data.vote_average
                            }))
                            .catch(err => {
                                console.error(`Failed to fetch details for movie ${id}:`, err);
                                return null; // 실패한 영화는 null 반환
                            })
                    );
                    const details = (await Promise.all(movieDetailsPromises)).filter(Boolean) as MovieSummary[];
                    return details;
                };

                // 각 목록에 대한 영화 상세 정보 가져오기
                const favDetails = await fetchMovieDetails(fetchedProfile.favoriteMovieIds || []);
                setFavoriteMoviesDetails(favDetails);

                // Watchlist 영화 ID 목록 대신 WatchlistMovie 객체 목록에서 movieId 추출
                const watchlistMovieIds = fetchedProfile.watchlistMovies?.map(item => item.movieId) || [];
                const watchDetails = await fetchMovieDetails(watchlistMovieIds);
                // WatchlistMovieDto의 watched 상태를 MovieSummary에 병합
                const watchDetailsWithWatched = watchDetails.map(movie => ({
                    ...movie,
                    watched: fetchedProfile.watchlistMovies?.find(item => item.movieId === movie.id)?.watched || false
                }));
                setWatchlistMoviesDetails(watchDetailsWithWatched);

                const ratedDetails = await fetchMovieDetails(Object.keys(fetchedProfile.ratedMovies || {}));
                setRatedMoviesDetails(ratedDetails);

            } catch (err) {
                console.error("사용자 프로필 및 영화 목록을 불러오는데 실패했습니다.", err);
                setPageError("프로필 정보를 불러오는 데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfileAndMovies();
    }, [isLoggedIn, navigate]);


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

    const handleToggleWatched = async (movieId: string) => {
        try {
            const response = await axiosInstance.patch<boolean>(`/watchlist/${movieId}/watched`);
            // 상태 업데이트
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

    if (!isLoggedIn) {
        return <div className="text-center p-12 text-2xl text-red-500">로그인이 필요합니다.</div>;
    }

    if (loading) {
        return <div className="text-center p-12 text-2xl dark:text-white">프로필 정보를 불러오는 중...</div>;
    }

    if (pageError) {
        return <div className="text-center p-12 text-2xl text-red-500">{pageError}</div>;
    }

    if (!profile) {
        return <div className="text-center p-12 text-2xl dark:text-white">프로필 정보를 찾을 수 없습니다.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
                <h1 className="text-4xl font-bold mb-8 text-center">내 프로필</h1>

                {/* 사용자 기본 정보 */}
                {/* <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h2 className="text-2xl font-semibold mb-4">기본 정보</h2>
                    <p className="text-lg mb-2"><strong>이름:</strong> {profile.name}</p>
                    <p className="text-lg mb-2"><strong>이메일:</strong> {profile.email}</p>
                    <p className="text-lg"><strong>역할:</strong> {profile.role}</p>
                </div> */}

                {/* 찜한 영화 */}
                <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h2 className="text-2xl font-semibold mb-4">찜한 영화 ({favoriteMoviesDetails.length})</h2>
                    {favoriteMoviesDetails.length === 0 ? (
                        <p className="text-gray-600 dark:text-gray-400">찜한 영화가 없습니다.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {favoriteMoviesDetails.map(movie => (
                                <MovieCard
                                    key={movie.id}
                                    id={parseInt(movie.id)}
                                    title={movie.title}
                                    posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'}
                                    isFavorite={true} // 찜한 영화 목록이므로 항상 true
                                    onToggleFavorite={() => {}} // 프로필 페이지에서는 토글 기능 비활성화
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Watchlist 영화 */}
                <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h2 className="text-2xl font-semibold mb-4">보고싶어요 ({watchlistMoviesDetails.length})</h2>
                    {watchlistMoviesDetails.length === 0 ? (
                        <p className="text-gray-600 dark:text-gray-400">보고싶어요 목록에 영화가 없습니다.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {watchlistMoviesDetails.map(movie => (
                                <div key={movie.id} className="relative">
                                    <MovieCard
                                        id={parseInt(movie.id)}
                                        title={movie.title}
                                        posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'}
                                        isFavorite={false} // Watchlist는 찜과 다름
                                        onToggleFavorite={() => {}}
                                    />
                                    <div className="absolute top-2 right-2 bg-black bg-opacity-70 rounded-full p-1">
                                        <input
                                            type="checkbox"
                                            checked={movie.watched || false}
                                            onChange={() => handleToggleWatched(movie.id)}
                                            className="form-checkbox h-5 w-5 text-yellow-500 rounded"
                                        />
                                    </div>
                                    {movie.watched && (
                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-xl font-bold">
                                            시청 완료
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 평점 매긴 영화 */}
                <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h2 className="text-2xl font-semibold mb-4">평점 매긴 영화 ({ratedMoviesDetails.length})</h2>
                    {ratedMoviesDetails.length === 0 ? (
                        <p className="text-gray-600 dark:text-gray-400">평점 매긴 영화가 없습니다.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {ratedMoviesDetails.map(movie => (
                                <div key={movie.id} className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm p-4">
                                    <img
                                        src={movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : 'https://via.placeholder.com/100x150?text=No+Image'}
                                        alt={movie.title}
                                        className="w-16 h-24 object-cover rounded-md mr-4"
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

                {/* 작성한 리뷰 */}
                <div className="mb-10">
                    <h2 className="text-2xl font-semibold mb-4">작성한 리뷰 ({profile?.reviews.length || 0})</h2>
                    {(profile?.reviews.length || 0) === 0 ? (
                        <p className="text-gray-600 dark:text-gray-400">작성한 리뷰가 없습니다.</p>
                    ) : (
                        <div className="space-y-6">
                            {profile?.reviews.map(review => (
                                <div key={review.id} className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center justify-between mb-2">
                                        {/* 영화 제목을 가져오기 위해 MovieSummary에서 찾거나, 백엔드에서 리뷰와 함께 영화 제목을 제공해야 함 */}
                                        <h3 className="font-bold text-lg">
                                            {favoriteMoviesDetails.find(m => m.id === review.movieId)?.title ||
                                             watchlistMoviesDetails.find(m => m.id === review.movieId)?.title ||
                                             ratedMoviesDetails.find(m => m.id === review.movieId)?.title ||
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
