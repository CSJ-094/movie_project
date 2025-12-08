import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MovieCard from './MovieCard';
import MovieCardSkeleton from './MovieCardSkeleton';

// 영화 요약 정보 인터페이스
interface MovieSummary {
  id: string;
  title: string;
  poster_path: string;
  vote_average: number;
}

const EmotionAnalysis: React.FC = () => {
    // 감정 분석 관련 상태들을 MyPage에서 이곳으로 이동
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [emotion, setEmotion] = useState<string | null>(null);
    const [recommendedMovies, setRecommendedMovies] = useState<MovieSummary[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    // 이미지 미리보기 URL 메모리 해제 로직
    useEffect(() => {
        return () => {
            if (imagePreviewUrl) {
                URL.revokeObjectURL(imagePreviewUrl);
            }
        };
    }, [imagePreviewUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);

            if (imagePreviewUrl) {
                URL.revokeObjectURL(imagePreviewUrl);
            }
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

            const visionApiKey = 'AIzaSyBtqszr8N9Ar5sosZGJZAsFp_A0DvaFZPc'; // 실제 사용 시에는 환경변수로 관리하는 것이 좋습니다.
            const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`;

            const requestBody = {
                requests: [{
                    image: { content: base64Image },
                    features: [{ type: 'FACE_DETECTION' }],
                }],
            };

            try {
                const visionResponse = await axios.post(visionApiUrl, requestBody);
                const faceAnnotations = visionResponse.data.responses[0]?.faceAnnotations;

                if (faceAnnotations && faceAnnotations.length > 0) {
                    const likelihoodScore: { [key: string]: number } = {
                        'UNKNOWN': 0, 'VERY_UNLIKELY': 1, 'UNLIKELY': 2, 'POSSIBLE': 3, 'LIKELY': 4, 'VERY_LIKELY': 5,
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
                        'joy': '기쁨', 'sorrow': '슬픔', 'anger': '분노', 'surprise': '놀람',
                    };
                    const detectedEmotion = emotionMap[mainEmotion] || '평온함';
                    setEmotion(detectedEmotion);

                    const genreMap: { [key: string]: number } = {
                        '기쁨': 35, '슬픔': 18, '분노': 28, '놀람': 9648, '평온함': 10749,
                    };
                    const genreId = genreMap[detectedEmotion];

                    if (genreId) {
                        const tmdbApiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb'; // 실제 사용 시에는 환경변수로 관리하는 것이 좋습니다.
                        const recommendResponse = await axios.get(`https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&with_genres=${genreId}&language=ko-KR&page=1`);
                        const movies = recommendResponse.data.results.slice(0, 5).map((m: any) => ({
                            id: m.id.toString(), title: m.title, poster_path: m.poster_path, vote_average: m.vote_average,
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

    return (
        <div className="mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
            <h2 className="text-2xl font-semibold mb-4">표정으로 영화 추천받기</h2>
            {imagePreviewUrl && (
                <div className="my-4 flex justify-center">
                    <img src={imagePreviewUrl} alt="업로드 미리보기" className="max-h-60 rounded-lg shadow-md" />
                </div>
            )}
            <div className="flex items-center space-x-4">
                <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                <button onClick={handleEmotionAnalysis} disabled={isAnalyzing} className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 whitespace-nowrap">
                    {isAnalyzing ? '분석 중...' : '감정 분석'}
                </button>
            </div>
            {analysisError && <p className="text-red-500 mt-4">{analysisError}</p>}
            {isAnalyzing && !recommendedMovies.length && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10 mt-4">
                    {Array.from({ length: 5 }).map((_, index) => <MovieCardSkeleton key={index} size="sm" staggerIndex={index} />)}
                </div>
            )}
            {emotion && (
                <div className="mt-6">
                    <p className="text-lg">분석된 감정: <span className="font-bold text-yellow-400">{emotion}</span></p>
                    <h3 className="text-xl font-semibold mt-4 mb-2">이런 영화는 어떠세요?</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                        {recommendedMovies.map((movie, index) => (
                            <MovieCard key={movie.id} id={parseInt(movie.id)} title={movie.title} posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'} size="sm" staggerIndex={index} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmotionAnalysis;