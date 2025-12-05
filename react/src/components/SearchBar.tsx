import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axiosInstance';

interface AutocompleteItem {
  movieId: string;
  title: string;
  releaseDate: string;
}

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

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

  // 자동완성 API 호출
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await axiosInstance.get('/movies/autocomplete', {
          params: { keyword: query, size: 5 }
        });
        setSuggestions(response.data.items || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('자동완성 오류:', error);
        setSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  // 외부 클릭 시 자동완성 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // AuthContext에서 필요한 값들을 가져옵니다.
  const { isLoggedIn, userEmail, userRole, logout } = useAuth();

  const handleSearch = async (e: React.FormEvent) => { // async 추가
    e.preventDefault();
    if (query.trim() !== '') {
      if (isLoggedIn) { // 로그인 상태일 때만 검색 기록 저장
        try {
          await axiosInstance.post('/search-history', { query: query.trim() });
        } catch (error) {
          console.error('검색 기록 저장 실패:', error);
        }
      }
      navigate(`/search?q=${query}`);
      setQuery('');
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (movieId: string) => {
    navigate(`/movie/${movieId}`);
    setQuery('');
    setShowSuggestions(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch(event as any);
    }
  };

  return (
    <header className="bg-gray-100 dark:bg-gray-800 text-white p-4 shadow-md transition-colors">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-gray-800 dark:text-white mb-4 md:mb-0">
          Movie Project
        </Link>

        <div className="flex items-center w-full md:w-auto">
          <div ref={searchRef} className="flex-grow flex mr-4 relative">
            <form onSubmit={handleSearch} className="flex w-full">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="영화 검색..."
                className="w-full px-3 py-2 rounded-l-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" className="bg-blue-500 px-6 py-2 rounded-r-md hover:bg-blue-600 whitespace-nowrap">
                검색
              </button>
            </form>

            {/* 자동완성 드롭다운 */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                {suggestions.map((item) => (
                  <div
                    key={item.movieId}
                    onClick={() => handleSuggestionClick(item.movieId)}
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                  >
                    <div className="font-medium">{item.title}</div>
                    {item.releaseDate && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">{item.releaseDate}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

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
