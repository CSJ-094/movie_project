import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });

  useEffect(() => {
    // 다크 모드 상태를 html 태그와 localStorage에 적용
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  // AuthContext에서 필요한 값들을 가져옵니다.
  const { isLoggedIn, userEmail, userRole, logout } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() !== '') {
      // 검색 페이지로 이동하면서 검색어를 쿼리 파라미터로 전달합니다.
      // 페이지를 새로고침하지 않고 URL만 변경하여 SPA의 장점을 살립니다.
      navigate(`/search?q=${query}`);
      setQuery(''); // 검색 후 입력창 비우기
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <header className="bg-gray-100 dark:bg-gray-800 text-white p-4 shadow-md transition-colors">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-gray-800 dark:text-white mb-4 md:mb-0">
          Movie Project
        </Link>
        
        <div className="flex items-center w-full md:w-auto">
          <form onSubmit={handleSearch} className="flex-grow flex mr-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="영화 검색..."
              className="w-full px-3 py-2 rounded-l-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="bg-blue-500 px-4 py-2 rounded-r-md hover:bg-blue-600">
              검색
            </button>
          </form>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <button onClick={toggleDarkMode} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white">
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            {isLoggedIn ? (
              <>
                <span className="hidden sm:inline text-gray-800 dark:text-gray-300 whitespace-nowrap">환영합니다, {userEmail}</span>
                <Link to="/mypage" className="bg-purple-500 px-3 py-2 rounded-md hover:bg-purple-600 text-white whitespace-nowrap">
                  마이페이지
                </Link>
                {userRole === 'ROLE_ADMIN' && (
                  <Link to="/admin" className="bg-yellow-500 px-3 py-2 rounded-md hover:bg-yellow-600 text-white whitespace-nowrap">관리자</Link>
                )}
                <button onClick={() => logout(navigate)} className="bg-red-500 px-3 py-2 rounded-md hover:bg-red-600 text-white">
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="bg-green-500 px-3 py-2 rounded-md hover:bg-green-600 text-white whitespace-nowrap">로그인</Link>
                <Link to="/register" className="bg-indigo-500 px-3 py-2 rounded-md hover:bg-indigo-600 text-white whitespace-nowrap">회원가입</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default SearchBar;
