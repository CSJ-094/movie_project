import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';

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
    const [keyword, setKeyword] = useState('영화');
    const [sort, setSort] = useState('date'); // sim (정확도순) or date (최신순)

    const fetchNews = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/news', {
                params: { query: keyword, sort }
            });
            setNews(response.data.items || []);
        } catch (error) {
            console.error('Failed to fetch news:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, [sort]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchNews();
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">영화 이슈</h1>

            {/* 검색 및 정렬 컨트롤 */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <form onSubmit={handleSearch} className="flex w-full md:w-auto shadow-sm">
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full md:w-64 transition-colors"
                        placeholder="검색어 입력 (예: 인기 영화)"
                    />
                    <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded-r-md hover:bg-red-700 transition-colors font-semibold">
                        검색
                    </button>
                </form>

                <div className="flex space-x-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-md">
                    <button
                        onClick={() => setSort('sim')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${sort === 'sim'
                            ? 'bg-white dark:bg-gray-600 text-red-600 shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        정확도순
                    </button>
                    <button
                        onClick={() => setSort('date')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${sort === 'date'
                            ? 'bg-white dark:bg-gray-600 text-red-600 shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        최신순
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {news.map((item, index) => (
                        <a
                            key={index}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:-translate-y-1"
                        >
                            <div className="p-6">
                                <h2
                                    className="text-lg font-bold mb-3 text-gray-900 dark:text-white line-clamp-2 group-hover:text-red-600 transition-colors"
                                    dangerouslySetInnerHTML={{ __html: item.title }}
                                />
                                <p
                                    className="text-gray-600 dark:text-gray-300 mb-4 text-sm line-clamp-3 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: item.description }}
                                />
                                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <span>{new Date(item.pubDate).toLocaleString()}</span>
                                    <span className="text-red-500 font-medium group-hover:underline">더 보기 →</span>
                                </div>
                            </div>
                        </a>
                    ))}
                    {news.length === 0 && !loading && (
                        <div className="col-span-full text-center py-20 text-gray-500 dark:text-gray-400">
                            검색 결과가 없습니다.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NewsPage;
