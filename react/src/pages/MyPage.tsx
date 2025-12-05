import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import MovieCard from '../components/MovieCard';
import StarRating from '../components/StarRating';
import axios from 'axios';
import MovieCardSkeleton from '../components/MovieCardSkeleton'; // MovieCardSkeleton 임포트

// 백엔드 UserProfileDto와 유사한 인터페이스 정의
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

    // 찜한 영화, Watchlist 영화 등의 상세 정보를 저장할 상태
    const [favoriteMoviesDetails, setFavoriteMoviesDetails] = useState<MovieSummary[]>([]);
    const [watchlistMoviesDetails, setWatchlistMoviesDetails] = useState<MovieSummary[]>([]);
    const [ratedMoviesDetails, setRatedMoviesDetails] = useState<MovieSummary[]>([]);

    // 감정 분석 기능 상태
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [emotion, setEmotion] = useState<string | null>(null);
    const [recommendedMovies, setRecommendedMovies] = useState<MovieSummary[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);


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
                    const movieDetailsPromises = movieIds.map(id =>
                        axiosInstance.get<MovieSummary>(`/movies/${id}`)
                            .then(res => ({
                                id: res.data.id.toString(),
                                title: res.data.title,
                                poster_path: res.data.poster_path,
                                vote_average: res.data.vote_average
                            }))
                            .catch(err => {
                                console.error(`Failed to fetch details for movie ${id}:`, err);
                                return null;
                            })
                    );
                    const details = (await Promise.all(movieDetailsPromises)).filter(Boolean) as MovieSummary[];
                    return details;
                };

                const favDetails = await fetchMovieDetails(fetchedProfile.favoriteMovieIds || []);
                setFavoriteMoviesDetails(favDetails);

                const watchlistMovieIds = fetchedProfile.watchlistMovies?.map(item => item.movieId) || [];
                const watchDetails = await fetchMovieDetails(watchlistMovieIds);
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

    // 이미지 미리보기 URL 메모리 해제
    useEffect(() => {
        return () => {
            if (imagePreviewUrl) {
                URL.revokeObjectURL(imagePreviewUrl);
            }
        };
    }, [imagePreviewUrl]);


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

    const handleToggleWatched = async (movieId: number) => {
        try {
            const response = await axiosInstance.patch<boolean>(`/watchlist/${movieId}/watched`);
            setWatchlistMoviesDetails(prevDetails =>
                prevDetails.map(movie =>
                    movie.id === movieId.toString() ? { ...movie, watched: response.data } : movie
                )
            );
            alert(response.data ? '시청 완료로 표시되었습니다.' : '시청 예정으로 표시되었습니다.');
        } catch (err) {
            console.error(`Failed to toggle watched status for movie ${movieId}:`, err);
            alert('시청 상태 변경에 실패했습니다.');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);

            // 기존 미리보기 URL 해제
            if (imagePreviewUrl) {
                URL.revokeObjectURL(imagePreviewUrl);
            }
            // 새 미리보기 URL 생성
            setImagePreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleEmotionAnalysis = async () => {
        if (!selectedFile) {
            setAnalysisError('분석할 사진을 선택해주세요.');
            return;
        }

        setIsAnalyzing(true);
        setAnalysisError(null);
        setEmotion(null);
        setRecommendedMovies([]);

        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = async () => {
            const imageDataUrl = reader.result as string;
            if (!imageDataUrl || !imageDataUrl.startsWith('data:image')) {
                setAnalysisError('이미지 파일을 올바르게 읽지 못했습니다. 다른 파일을 시도해주세요.');
                setIsAnalyzing(false);
                return;
            }
            const base64Image = imageDataUrl.split(',')[1];

            const visionApiKey = 'AIzaSyBtqszr8N9Ar5sosZGJZAsFp_A0DvaFZPc';
            const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`;

            const requestBody = {
                requests: [
                    {
                        image: { content: base64Image },
                        features: [{ type: 'FACE_DETECTION' }],
                    },
                ],
            };

            try {
                const visionResponse = await axios.post(visionApiUrl, requestBody);
                const faceAnnotations = visionResponse.data.responses[0]?.faceAnnotations;

                if (faceAnnotations && faceAnnotations.length > 0) {
                    const likelihoodScore: { [key: string]: number } = {
                        'UNKNOWN': 0,
                        'VERY_UNLIKELY': 1,
                        'UNLIKELY': 2,
                        'POSSIBLE': 3,
                        'LIKELY': 4,
                        'VERY_LIKELY': 5,
                    };

                    const emotions = {
                        joy: faceAnnotations[0].joyLikelihood,
                        sorrow: faceAnnotations[0].sorrowLikelihood,
                        anger: faceAnnotations[0].angerLikelihood,
                        surprise: faceAnnotations[0].surpriseLikelihood,
                    };

                    const mainEmotion = Object.entries(emotions).reduce((a, b) => 
                        likelihoodScore[a[1]] > likelihoodScore[b[1]] ? a : b
                    )[0];
                    
                    const emotionMap: { [key: string]: string } = {
                        'joy': '기쁨',
                        'sorrow': '슬픔',
                        'anger': '분노',
                        'surprise': '놀람',
                    };
                    const detectedEmotion = emotionMap[mainEmotion] || '평온함';
                    setEmotion(detectedEmotion);

                    const genreMap: { [key: string]: number } = {
                        '기쁨': 35, // 코미디
                        '슬픔': 18, // 드라마
                        '분노': 28, // 액션
                        '놀람': 9648, // 미스터리
                        '평온함': 10749, // 로맨스
                    };
                    const genreId = genreMap[detectedEmotion];

                    if (genreId) {
                        const tmdbApiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
                        const recommendResponse = await axios.get(`https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&with_genres=${genreId}&language=ko-KR&page=1`);
                        const movies = recommendResponse.data.results.slice(0, 5).map((m: any) => ({
                            id: m.id.toString(),
                            title: m.title,
                            poster_path: m.poster_path,
                            vote_average: m.vote_average,
                        }));
                        setRecommendedMovies(movies);
                    }
                } else {
                    setAnalysisError('사진에서 얼굴을 감지할 수 없습니다.');
                }
            } catch (err: any) {
                const apiErrorMessage = err.response?.data?.error?.message;
                console.error('감정 분석 또는 영화 추천 실패:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
                setAnalysisError(apiErrorMessage || '감정 분석 중 오류가 발생했습니다. API 키 또는 요청을 확인해주세요.');
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.onerror = () => {
            setAnalysisError('파일을 읽는 중 오류가 발생했습니다.');
            setIsAnalyzing(false);
        };
    };


    if (!isLoggedIn) {
        return <div className="text-center p-12 text-2xl text-red-500">로그인이 필요합니다.</div>;
    }

    if (pageError) {
        return <div className="text-center p-12 text-2xl text-red-500">{pageError}</div>;
    }

    if (!profile && !loading) { // 로딩이 끝났는데 프로필이 없으면 에러
        return <div className="text-center p-12 text-2xl dark:text-white">프로필 정보를 찾을 수 없습니다.</div>;
    }

    // 로딩 중일 때 스켈레톤 UI를 보여줍니다.
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
                <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
                    <h1 className="text-4xl font-bold mb-8 text-center animate-pulse bg-gray-200 dark:bg-gray-700 h-10 w-1/2 mx-auto rounded"></h1>

                    {/* 감정 분석 영화 추천 섹션 스켈레톤 */}
                    <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
                        <h2 className="text-2xl font-semibold mb-4 animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-1/3 rounded"></h2>
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <MovieCardSkeleton key={index} size="sm" staggerIndex={index} />
                            ))}
                        </div>
                    </div>

                    {/* 찜한 영화 스켈레톤 */}
                    <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
                        <h2 className="text-2xl font-semibold mb-4 animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-1/4 rounded"></h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <MovieCardSkeleton key={index} size="sm" staggerIndex={index} />
                            ))}
                        </div>
                    </div>

                    {/* Watchlist 영화 스켈레톤 */}
                    <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
                        <h2 className="text-2xl font-semibold mb-4 animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-1/4 rounded"></h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <MovieCardSkeleton key={index} size="sm" staggerIndex={index} />
                            ))}
                        </div>
                    </div>

                    {/* 평점 매긴 영화 스켈레톤 */}
                    <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
                        <h2 className="text-2xl font-semibold mb-4 animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-1/4 rounded"></h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Array.from({ length: 2 }).map((_, index) => (
                                <div key={index} className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm p-4 animate-pulse">
                                    <div className="w-16 h-24 bg-gray-300 dark:bg-gray-600 rounded-md mr-4"></div>
                                    <div>
                                        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2"></div>
                                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 작성한 리뷰 스켈레톤 */}
                    <div className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4 animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-1/5 rounded"></h2>
                        <div className="space-y-6">
                            {Array.from({ length: 2 }).map((_, index) => (
                                <div key={index} className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 animate-pulse">
                                    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
                                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 계정 관리 스켈레톤 */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-10">
                        <h2 className="text-2xl font-semibold mb-4 animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-1/4 rounded"></h2>
                        <p className="text-lg mb-6 animate-pulse bg-gray-200 dark:bg-gray-700 h-6 w-1/3 rounded"></p>

                        <div className="border-t pt-6 border-gray-200 dark:border-gray-700">
                            <h2 className="text-2xl font-semibold mb-4 animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-1/3 rounded"></h2>
                            <div className="space-y-4">
                                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                            </div>
                        </div>

                        <div className="mt-8 border-t pt-6 border-red-300 dark:border-red-700">
                            <h2 className="text-2xl font-semibold mb-4 text-red-500 animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-1/4 rounded"></h2>
                            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
                <h1 className="text-4xl font-bold mb-8 text-center">내 프로필</h1>

                {/* 감정 분석 영화 추천 섹션 */}
                <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h2 className="text-2xl font-semibold mb-4">표정으로 영화 추천받기</h2>
                    
                    {imagePreviewUrl && (
                        <div className="my-4 flex justify-center">
                            <img src={imagePreviewUrl} alt="업로드 미리보기" className="max-h-60 rounded-lg shadow-md" />
                        </div>
                    )}

                    <div className="flex items-center space-x-4">
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <button 
                            onClick={handleEmotionAnalysis} 
                            disabled={isAnalyzing}
                            className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 whitespace-nowrap"
                        >
                            {isAnalyzing ? '분석 중...' : '감정 분석'}
                        </button>
                    </div>
                    {analysisError && <p className="text-red-500 mt-4">{analysisError}</p>}
                    {emotion && (
                        <div className="mt-6">
                            <p className="text-lg">분석된 감정: <span className="font-bold text-yellow-400">{emotion}</span></p>
                            <h3 className="text-xl font-semibold mt-4 mb-2">이런 영화는 어떠세요?</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                                {recommendedMovies.map((movie, index) => (
                                    <MovieCard
                                        key={movie.id}
                                        id={parseInt(movie.id)}
                                        title={movie.title}
                                        posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'}
                                        size="sm"
                                        staggerIndex={index}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 찜한 영화 */}
                <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h2 className="text-2xl font-semibold mb-4">찜한 영화 ({favoriteMoviesDetails.length})</h2>
                    {favoriteMoviesDetails.length === 0 ? (
                        <p className="text-gray-600 dark:text-gray-400">찜한 영화가 없습니다.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                            {favoriteMoviesDetails.map((movie, index) => (
                                <MovieCard
                                    key={movie.id}
                                    id={parseInt(movie.id)}
                                    title={movie.title}
                                    posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'}
                                    isFavorite={true}
                                    onToggleFavorite={() => {}}
                                    size="sm"
                                    staggerIndex={index}
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                            {watchlistMoviesDetails.map((movie, index) => (
                                <MovieCard
                                    key={movie.id}
                                    id={parseInt(movie.id)}
                                    title={movie.title}
                                    posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'}
                                    isWatched={movie.watched || false}
                                    showWatchlistControls={true}
                                    onToggleWatched={() => handleToggleWatched(parseInt(movie.id))}
                                    size="sm"
                                    staggerIndex={index}
                                />
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

                    <div className="mt-8 border-t pt-6 border-red-300 dark:border-gray-700">
                        <h2 className="text-2xl font-semibold mb-4 text-red-500">계정 삭제</h2>
                        <button onClick={handleDeleteAccount} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">회원 탈퇴</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyPage;
