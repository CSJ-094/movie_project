import React from 'react';

const MovieCardSkeleton: React.FC = () => {
  return (
    <div className="m-2 w-48 animate-pulse">
      <div className="bg-gray-300 dark:bg-gray-700 h-72 rounded-lg"></div>
      <div className="mt-2 h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
    </div>
  );
};

export default MovieCardSkeleton;