import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Link } from 'react-router-dom';

interface NewsItem {
    title: string;
    originallink: string;
    link: string;
    description: string;
    pubDate: string;
}

const NewsPage: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [sort, setSort] = useState('date'); // default: latest
    const [page, setPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 12;

    const fetchNews = async (currentPage: number) => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/news', {
                params: { query: '영화', sort, page: currentPage, size: itemsPerPage }
            });
            setNews(response.data.items || []);
            setTotalItems(response.data.total || 0);
        } catch (error) {
            console.error('Failed to fetch news:', error);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchNews(page);
    }, [sort, page]);

    // HTML 태그 제거 및 디코딩 함수
    const cleanHtml = (html: string) => {
        const txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value.replace(/<[^>]*>?/gm, '');
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        scrollToTop();
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            {/* Hero Section */}
            <div className="relative bg-gradient-to-r from-red-600 to-amber-600 dark:from-red-900 dark:to-amber-900 py-16 px-4 sm:px-6 lg:px-8 shadow-lg">
                <div className="absolute inset-0 bg-black opacity-10 pattern-grid-lg"></div>
                <div className="relative max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4 drop-shadow-md">
                        영화 뉴스 & 트렌드
                    </h1>
                    <p className="text-lg text-red-100 max-w-2xl mx-auto mb-8 font-medium">
                        최신 영화 소식, 리뷰, 그리고 핫한 이슈들을 한눈에 확인하세요.
                    </p>

                    {/* Search Bar (Floating) */}
                    <div className="max-w-3xl mx-auto hidden"></div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Sort Buttons */}
                <div className="flex justify-end items-center mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div className="flex space-x-1 bg-gray-200 dark:bg-gray-800 p-1 rounded-lg">
                        {['sim', 'date'].map((option) => (
                            <button
                                key={option}
                                onClick={() => setSort(option)}
                                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${sort === option
                                    ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {option === 'sim' ? '정확도순' : '최신순'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* News Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-64 flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                </div>
                                <div className="space-y-2 mt-4">
                                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {news.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {news.map((item, index) => (
                                    <a
                                        key={index}
                                        href={item.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group"
                                    >
                                        <div className="bg-white dark:bg-gray-800 h-full rounded-2xl p-6 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 transform hover:-translate-y-1 hover:border-red-100 dark:hover:border-red-900/30 flex flex-col justify-between relative overflow-hidden">
                                            {/* Decorative Accent */}
                                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                            <div>
                                                {/* Title with highlighting handling (removing b tags visually but keeping bold) */}
                                                <h3
                                                    className="text-lg font-bold text-gray-900 dark:text-white mb-3 leading-snug group-hover:text-red-600 transition-colors line-clamp-2"
                                                    dangerouslySetInnerHTML={{ __html: item.title }}
                                                />

                                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3">
                                                    {cleanHtml(item.description)}
                                                </p>
                                            </div>

                                            <div className="flex justify-between items-center text-xs pt-4 border-t border-gray-100 dark:border-gray-700 mt-auto">
                                                <span className="text-gray-400 font-medium flex items-center">
                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                    {formatDate(item.pubDate)}
                                                </span>
                                                <span className="text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 transform duration-300 flex items-center">
                                                    읽기
                                                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                                </span>
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">검색 결과가 없습니다.</h3>
                                <p className="text-gray-500 dark:text-gray-400">다른 키워드로 검색해보세요.</p>
                            </div>
                        )}

                        {/* Pagination UI */}
                        {!loading && news.length > 0 && (
                            <div className="flex justify-center items-center mt-12 space-x-4">
                                <button
                                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium flex items-center"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                                    이전
                                </button>

                                <div className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                                    <span className="text-red-600 font-bold text-lg mr-1">{page}</span>
                                    <span className="text-gray-400 mx-2">/</span>
                                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                                        {Math.min(Math.ceil(totalItems / itemsPerPage), Math.ceil(1000 / itemsPerPage))}
                                    </span>
                                </div>

                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    // Naver News API start max is 1000. 
                                    disabled={page >= Math.min(Math.ceil(totalItems / itemsPerPage), Math.ceil(1000 / itemsPerPage))}
                                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium flex items-center"
                                >
                                    다음
                                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default NewsPage;
