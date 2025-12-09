import React from 'react';

interface MovieCardSkeletonProps {
  size?: 'sm' | 'md' | 'lg';
  staggerIndex?: number;
}

const MovieCardSkeleton: React.FC<MovieCardSkeletonProps> = ({ size = 'lg', staggerIndex = 0 }) => {
  const sizeClassName = {
    sm: 'w-40 h-64', // sm 사이즈에 맞는 높이
    md: 'w-48 h-72', // md 사이즈에 맞는 높이
    lg: 'w-64 h-96', // lg 사이즈에 맞는 높이
  }[size];

  return (
    <div
      className={`relative flex-shrink-0 rounded-lg overflow-hidden shadow-lg bg-gray-200 dark:bg-gray-700 animate-pulse
                  transition-all duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
                  ${sizeClassName}`}
      style={{ transitionDelay: `${staggerIndex * 75}ms` }}
    >
      {/* 포스터 영역 */}
      <div className="w-full h-full bg-gray-300 dark:bg-gray-600"></div>
      {/* 제목 영역 */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gray-400 dark:bg-gray-800 bg-opacity-50 p-2 flex items-center justify-center">
        <div className="h-4 w-3/4 bg-gray-300 dark:bg-gray-600 rounded"></div>
      </div>
      {/* 찜 버튼 영역 */}
      <div className="absolute top-2 right-2 p-1.5 bg-gray-400 dark:bg-gray-800 bg-opacity-60 rounded-full w-8 h-8"></div>
      {/* 트레일러 버튼 영역 */}
      <div className="absolute bottom-2 left-2 p-1.5 bg-gray-400 dark:bg-gray-800 bg-opacity-60 rounded-full w-8 h-8"></div>
    </div>
  );
};

export default MovieCardSkeleton;
