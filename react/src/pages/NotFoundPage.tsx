import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white text-center px-4 overflow-hidden">
      <div className="relative">
        {/* 배경에 빛나는 효과를 위한 블러 처리된 원 */}
        <div className="absolute -inset-20 bg-red-600 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute -inset-20 top-10 left-10 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse animation-delay-2000"></div>

        {/* 404 텍스트 */}
        <h1 className="relative text-9xl md:text-[250px] font-black text-white drop-shadow-2xl animate-float">
          404
        </h1>
      </div>

      <h2 className="mt-4 text-4xl font-extrabold tracking-tight">
        이런, 길을 잃으셨군요!
      </h2>
      <p className="mt-2 text-lg text-gray-300 max-w-md">
        요청하신 페이지는 존재하지 않거나 다른 우주로 사라졌을 수 있습니다.
      </p>
      <Link
        to="/"
        className="mt-10 px-8 py-4 bg-red-600 text-white font-bold rounded-full shadow-lg shadow-red-600/30 transform hover:scale-110 hover:bg-red-700 transition-all duration-300 ease-in-out"
      >
        안전한 홈으로 귀환하기
      </Link>
    </div>
  );
};

export default NotFoundPage;