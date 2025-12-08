import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, EffectCoverflow } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow';
import axios from '../api/axiosInstance'; // Corrected import path
import { useNavigate } from 'react-router-dom';

interface RecapData {
    userName: string;
    activitySummary: {
        totalActivityCount: number;
        mostActiveMonth: string;
    };
    watchedAnalysis: {
        totalWatchedCount: number;
        totalRuntimeMinutes: number;
        topGenre: string;
        topEra: string;
    };
    ratingAnalysis: {
        averageRating: number;
        totalReviews: number;
        topRatedMovie?: {
            movieId: string;
            title: string;
            posterUrl: string;
            userRating: number;
            globalRating: number;
        };
        hiddenGem?: {
            movieId: string;
            title: string;
            posterUrl: string;
            userRating: number;
            globalRating: number;
        };
    };
    watchlistAnalysis: {
        totalWatchlistCount: number;
        topGenreInWatchlist: string;
    };
    awards: {
        title: string;
    };
}

const RecapPage: React.FC = () => {
    const [data, setData] = useState<RecapData | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('/recap');
                setData(response.data);
            } catch (error) {
                console.error('Failed to fetch recap:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="flex h-screen items-center justify-center text-white bg-black">Loading your journey...</div>;
    if (!data) return <div className="flex h-screen items-center justify-center text-white bg-black">Failed to load recap.</div>;

    return (
        <div className="h-screen w-full bg-black text-white overflow-hidden">
            <Swiper
                effect={'coverflow'}
                grabCursor={true}
                centeredSlides={true}
                slidesPerView={'auto'}
                coverflowEffect={{
                    rotate: 50,
                    stretch: 0,
                    depth: 100,
                    modifier: 1,
                    slideShadows: true,
                }}
                pagination={true}
                modules={[EffectCoverflow, Pagination]}
                className="mySwiper h-full w-full"
            >
                {/* Intro Slide */}
                <SwiperSlide className="flex items-center justify-center bg-gradient-to-br from-purple-800 to-blue-900 rounded-xl p-8 max-w-md mx-auto my-auto h-[80%]">
                    <div className="text-center space-y-6">
                        <h1 className="text-4xl font-bold animate-pulse">🎬 <br />{data.userName}님의<br />2025 영화 여정</h1>
                        <p className="text-xl opacity-80">당신의 특별한 영화 기록을 확인해보세요.</p>
                        <div className="mt-8">
                            <span className="text-6xl">✨</span>
                        </div>
                    </div>
                </SwiperSlide>

                {/* Activity Summary */}
                <SwiperSlide className="flex items-center justify-center bg-gray-900 rounded-xl p-8 max-w-md mx-auto my-auto h-[80%] border border-gray-700">
                    <div className="text-center space-y-8">
                        <h2 className="text-2xl font-semibold text-purple-400">올해의 활동</h2>
                        <div className="space-y-2">
                            <p className="text-lg">총 활동 수</p>
                            <p className="text-5xl font-bold text-yellow-400">{data.activitySummary.totalActivityCount}회</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-lg">가장 불태웠던 달</p>
                            <p className="text-4xl font-bold text-pink-500">{data.activitySummary.mostActiveMonth}</p>
                        </div>
                    </div>
                </SwiperSlide>

                {/* Watched Analysis */}
                <SwiperSlide className="flex items-center justify-center bg-indigo-900 rounded-xl p-8 max-w-md mx-auto my-auto h-[80%]">
                    <div className="text-center space-y-8 w-full">
                        <h2 className="text-2xl font-semibold text-cyan-400">시청 기록</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/10 p-4 rounded-lg">
                                <p className="text-sm">시청한 영화</p>
                                <p className="text-2xl font-bold">{data.watchedAnalysis.totalWatchedCount}편</p>
                            </div>
                            <div className="bg-white/10 p-4 rounded-lg">
                                <p className="text-sm">총 시간</p>
                                <p className="text-2xl font-bold">{Math.round(data.watchedAnalysis.totalRuntimeMinutes / 60)}시간</p>
                            </div>
                        </div>
                        <div className="space-y-2 text-left px-4">
                            <p>🎭 최애 장르: <span className="font-bold text-yellow-300">{data.watchedAnalysis.topGenre}</span></p>
                            <p>🕰️ 선호 시대: <span className="font-bold text-green-300">{data.watchedAnalysis.topEra}</span></p>
                        </div>
                    </div>
                </SwiperSlide>

                {/* Top Rated Movie */}
                {data.ratingAnalysis.topRatedMovie && (
                    <SwiperSlide className="flex flex-col items-center justify-center bg-black rounded-xl p-0 max-w-md mx-auto my-auto h-[80%] overflow-hidden relative">
                        <img
                            src={data.ratingAnalysis.topRatedMovie.posterUrl || ''}
                            alt={data.ratingAnalysis.topRatedMovie.title}
                            className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm"
                        />
                        <div className="relative z-10 text-center p-6 space-y-4">
                            <h2 className="text-2xl font-bold text-yellow-400">🏆 나만의 명작</h2>
                            {data.ratingAnalysis.topRatedMovie.posterUrl && (
                                <img
                                    src={data.ratingAnalysis.topRatedMovie.posterUrl}
                                    alt="Poster"
                                    className="w-48 rounded-lg shadow-2xl mx-auto border-4 border-yellow-500"
                                />
                            )}
                            <h3 className="text-xl font-bold line-clamp-2">{data.ratingAnalysis.topRatedMovie.title}</h3>
                            <div className="flex justify-center gap-4 text-sm">
                                <span className="bg-yellow-600 px-3 py-1 rounded-full">내 점수 ⭐ {data.ratingAnalysis.topRatedMovie.userRating}</span>
                                <span className="bg-gray-700 px-3 py-1 rounded-full">평균 ⭐ {data.ratingAnalysis.topRatedMovie.globalRating.toFixed(1)}</span>
                            </div>
                        </div>
                    </SwiperSlide>
                )}

                {/* Hidden Gem */}
                {data.ratingAnalysis.hiddenGem && (
                    <SwiperSlide className="flex flex-col items-center justify-center bg-emerald-900 rounded-xl p-0 max-w-md mx-auto my-auto h-[80%] relative overflow-hidden">
                        <img
                            src={data.ratingAnalysis.hiddenGem.posterUrl || ''}
                            alt={data.ratingAnalysis.hiddenGem.title}
                            className="absolute inset-0 w-full h-full object-cover opacity-30"
                        />
                        <div className="relative z-10 text-center p-6 space-y-4">
                            <h2 className="text-2xl font-bold text-emerald-400">💎 숨은 보석 발견!</h2>
                            <p className="text-sm opacity-90 px-4">남들은 몰라봤지만,<br />회원님은 진가를 알아보셨군요.</p>
                            {data.ratingAnalysis.hiddenGem.posterUrl && (
                                <img
                                    src={data.ratingAnalysis.hiddenGem.posterUrl}
                                    alt="Poster"
                                    className="w-40 rounded-lg shadow-2xl mx-auto border-2 border-emerald-400"
                                />
                            )}
                            <h3 className="text-lg font-bold">{data.ratingAnalysis.hiddenGem.title}</h3>
                        </div>
                    </SwiperSlide>
                )}

                {/* Watchlist & Future */}
                <SwiperSlide className="flex items-center justify-center bg-blue-800 rounded-xl p-8 max-w-md mx-auto my-auto h-[80%]">
                    <div className="text-center space-y-8">
                        <h2 className="text-2xl font-semibold text-blue-300">미래의 계획</h2>
                        <div className="space-y-4">
                            <p className="text-lg">기다리고 있는 영화</p>
                            <p className="text-5xl font-bold text-white">{data.watchlistAnalysis.totalWatchlistCount}편</p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-lg mt-4">
                            <p className="text-sm mb-2">다음엔 이 장르 어때요?</p>
                            <p className="text-2xl font-bold text-blue-200">#{data.watchlistAnalysis.topGenreInWatchlist}</p>
                        </div>
                    </div>
                </SwiperSlide>

                {/* Awards & Outro */}
                <SwiperSlide className="flex items-center justify-center bg-gradient-to-t from-orange-900 to-red-900 rounded-xl p-8 max-w-md mx-auto my-auto h-[80%]">
                    <div className="text-center space-y-8">
                        <h2 className="text-3xl font-bold text-orange-400">🎖️ 올해의 타이틀</h2>
                        <div className="py-8">
                            <p className="text-4xl font-black text-white tracking-wider animate-bounce">{data.awards.title}</p>
                        </div>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-white text-red-900 px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors"
                        >
                            메인으로 돌아가기
                        </button>
                        <p className="text-sm opacity-60 mt-4">2026년에도 함께해요!</p>
                    </div>
                </SwiperSlide>

            </Swiper>

            {/* Custom Styles for Swiper Pagination */}
            <style>{`
        .swiper-pagination-bullet { background-color: white; opacity: 0.5; }
        .swiper-pagination-bullet-active { background-color: #fbbf24; opacity: 1; }
      `}</style>
        </div >
    );
};

export default RecapPage;
