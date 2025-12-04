import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import MovieCard from '../components/MovieCard';
import StarRating from '../components/StarRating';

interface Movie {
    id: number;
    title: string;
    poster_path: string;
    userRating?: number;
}

const MyPage: React.FC = () => {
    const { userEmail, logout } = useAuth();
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [favoriteMovies, setFavoriteMovies] = useState<Movie[]>([]);
    const [ratedMovies, setRatedMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMyMovies = async () => {
            setLoading(true);
            try {
                const [favResponse, ratingsResponse] = await Promise.all([
                    axiosInstance.get<number[]>('/favorites'),
                    axiosInstance.get<Record<string, number>>('/ratings')
                ]);

                const favoriteMovieIds = favResponse.data;
                const ratedMoviesMap = ratingsResponse.data;

                const fetchMovieDetails = async (id: number) => {
                    const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
                    const response = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=ko-KR`);
                    return response.json();
                };

                const favoritePromises = favoriteMovieIds.map(id => fetchMovieDetails(id));
                const favoriteResults = await Promise.all(favoritePromises);
                setFavoriteMovies(favoriteResults);

                const ratedMovieIds = Object.keys(ratedMoviesMap).map(Number);
                const ratedPromises = ratedMovieIds.map(id => fetchMovieDetails(id));
                const ratedResults = await Promise.all(ratedPromises);
                const ratedMoviesWithRating = ratedResults.map(movie => ({
                    ...movie,
                    userRating: ratedMoviesMap[movie.id]
                }));
                setRatedMovies(ratedMoviesWithRating);

            } catch (err) {
                console.error("내가 찜하거나 평가한 영화 목록을 불러오는데 실패했습니다.", err);
                setError("영화 목록을 불러오는 데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchMyMovies();
    }, []);

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

    return (
        <div className="p-8 max-w-7xl mx-auto text-gray-800 dark:text-white">
            <h1 className="text-3xl font-bold mb-6">마이페이지</h1>

            <div className="mb-12">
                <h2 className="text-2xl font-semibold mb-4 border-b pb-2">내가 찜한 영화</h2>
                {loading ? <p>로딩 중...</p> : 
                    favoriteMovies.length > 0 ? (
                        <div className="flex flex-wrap -m-2">
                            {favoriteMovies.map(movie => (
                                <div key={movie.id} className="p-2">
                                    <MovieCard 
                                        id={movie.id}
                                        title={movie.title}
                                        posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : ''}
                                        isFavorite={true}
                                        onToggleFavorite={() => {}}
                                        size="sm"
                                        showTitle={false} // 제목 숨기기
                                    />
                                </div>
                            ))}
                        </div>
                    ) : <p>찜한 영화가 없습니다.</p>
                }
            </div>

            <div className="mb-12">
                <h2 className="text-2xl font-semibold mb-4 border-b pb-2">내가 평가한 영화</h2>
                {loading ? <p>로딩 중...</p> : 
                    ratedMovies.length > 0 ? (
                        <div className="flex flex-wrap -m-2">
                            {ratedMovies.map(movie => (
                                <div key={movie.id} className="p-2">
                                    <MovieCard 
                                        id={movie.id}
                                        title={movie.title}
                                        posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : ''}
                                        isFavorite={false}
                                        onToggleFavorite={() => {}}
                                        size="sm"
                                        showTitle={false} // 제목 숨기기
                                    />
                                    <div className="flex justify-center">
                                        <StarRating rating={movie.userRating || 0} readOnly={true} size="sm" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p>평가한 영화가 없습니다.</p>
                }
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
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
    );
};

export default MyPage;
