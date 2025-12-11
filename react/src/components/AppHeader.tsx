import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// --- 상단 카테고리 헤더 컴포넌트 ---
const AppHeader: React.FC = () => {
  const location = useLocation();
  // 카테고리 링크를 MainPage의 각 섹션에 해당하는 URL로 변경합니다.
  const categories = [
    { name: '모든 영화', path: '/movies/all-page' },
    { name: '현재 상영중', path: '/movies/now-playing-page' },
    { name: '인기 영화', path: '/movies/popular-page' },
    { name: '높은 평점', path: '/movies/top-rated-page' },
    { name: '개봉 예정', path: '/movies/upcoming-page' },
  ];

  return (
    <header className="bg-gray-900 bg-opacity-80 backdrop-blur-sm text-white shadow-lg sticky top-16 z-40">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-16">
          <div className="flex items-baseline space-x-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                to={category.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-300 ${location.pathname === category.path
                  ? 'bg-red-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
              >{category.name}</Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default AppHeader;