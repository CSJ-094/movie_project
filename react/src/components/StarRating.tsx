import React, { useState } from 'react';

interface StarRatingProps {
  rating: number; // 현재 별점 (e.g., 7.5)
  onRatingChange?: (newRating: number) => void; // 별점 변경 시 호출될 함수
  readOnly?: boolean; // 읽기 전용 여부
  size?: 'sm' | 'md' | 'lg'; // 별 크기
  maxRating?: number; // 최대 별점 (e.g., 10)
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onRatingChange, readOnly = false, size = 'md', maxRating = 5 }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const starSize = {
    sm: 'h-4 w-4',
    md: 'h-7 w-7', // 사이즈를 약간 키워 가독성 확보
    lg: 'h-8 w-8',
  }[size];

  // 10점 만점 시스템을 5개의 별로 표현
  const displayRating = (hoverRating || rating) / (maxRating / 5);

  return (
    <div className="flex items-center">
      {Array.from({ length: 5 }, (_, index) => {
        const starIndex = index + 1;

        return (
          <div
            key={starIndex}
            className={`relative cursor-${readOnly ? 'default' : 'pointer'} text-yellow-400 ${starSize}`}
            onMouseLeave={() => !readOnly && setHoverRating(0)} // 마우스가 별 영역을 떠나면 호버 상태 초기화
          >
            {/* 별의 왼쪽 절반 (0.5점 단위) */}
            <div
              className="absolute left-0 top-0 h-full w-1/2 z-10"
              onMouseEnter={() => !readOnly && setHoverRating((starIndex - 0.5) * (maxRating / 5))}
              onClick={() => !readOnly && onRatingChange && onRatingChange((starIndex - 0.5) * (maxRating / 5))}
            />
            {/* 별의 오른쪽 절반 (1점 단위) */}
            <div
              className="absolute right-0 top-0 h-full w-1/2 z-10"
              onMouseEnter={() => !readOnly && setHoverRating(starIndex * (maxRating / 5))}
              onClick={() => !readOnly && onRatingChange && onRatingChange(starIndex * (maxRating / 5))}
            />

            <svg fill="currentColor" viewBox="0 0 24 24" className="relative">
              {/* 배경이 되는 빈 별 (회색) */}
              <path
                className="text-gray-300 dark:text-gray-600"
                stroke="currentColor"
                strokeWidth={1.5}
                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
              />
              {/* 채워지는 별 (노란색) */}
              <defs>
                <clipPath id={`clip-${starIndex}`}>
                  <rect
                    x="0"
                    y="0"
                    width={
                      starIndex <= displayRating ? '100%' :
                      starIndex - 0.5 <= displayRating ? '50%' : '0%'
                    }
                    height="100%"
                  />
                </clipPath>
              </defs>
              <path
                clipPath={`url(#clip-${starIndex})`}
                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
};

export default StarRating;
