import React, { useState } from 'react';

interface StarRatingProps {
  rating: number; // 현재 별점 (0~5)
  onRatingChange?: (newRating: number) => void; // 별점 변경 시 호출될 함수
  readOnly?: boolean; // 읽기 전용 여부
  size?: 'sm' | 'md' | 'lg'; // 별 크기
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onRatingChange, readOnly = false, size = 'md' }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const starSize = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }[size];

  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => {
        const displayRating = hoverRating || rating;
        const isFilled = star <= displayRating;
        const isHalf = !isFilled && (star - 0.5) <= displayRating;

        return (
          <div
            key={star}
            className={`cursor-${readOnly ? 'default' : 'pointer'} text-yellow-400 ${starSize}`}
            onMouseEnter={() => !readOnly && setHoverRating(star)}
            onMouseLeave={() => !readOnly && setHoverRating(0)}
            onClick={() => !readOnly && onRatingChange && onRatingChange(star)}
          >
            <svg fill={isFilled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              {isHalf && (
                <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2V17.27z" />
              )}
            </svg>
          </div>
        );
      })}
    </div>
  );
};

export default StarRating;
