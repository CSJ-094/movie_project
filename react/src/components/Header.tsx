import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axiosInstance';

interface AutocompleteItem {
  movieId: string;
  title: string;
  releaseDate: string;
}

const Header: React.FC = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // 모바일 메뉴 상태
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null); // 모바일 메뉴 참조

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });

  // 다크 모드 상태를 html 태그와 localStorage에 적용
  useEffect(() => {
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

  // 외부 클릭 시 자동완성 및 모바일 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const { isLoggedIn, userEmail, userRole, logout } = useAuth();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() !== '') {
      if (isLoggedIn) {
        try {
          await axiosInstance.post('/search-history', { query: query.trim() });
        } catch (error) {
          console.error('검색 기록 저장 실패:', error);
        }
      }
      navigate(`/search?q=${query}`);
      setQuery('');
      setShowSuggestions(false);
      setIsMobileMenuOpen(false); // 검색 후 모바일 메뉴 닫기
    }
  };

  const handleSuggestionClick = (movieId: string) => {
    navigate(`/movie/${movieId}`);
    setQuery('');
    setShowSuggestions(false);
    setIsMobileMenuOpen(false); // 제안 클릭 후 모바일 메뉴 닫기
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch(event as any);
    }
  };

  const handleLogout = () => {
    logout(navigate);
    setIsMobileMenuOpen(false); // 로그아웃 후 모바일 메뉴 닫기
  };

  const navLinkClass = "block py-2 px-3 text-gray-800 dark:text-white rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors";
  const authButtonClass = "w-full text-center py-2 px-3 rounded-md transition-colors font-semibold";

  return (
    <header className="bg-white dark:bg-gray-900 text-gray-800 dark:text-white shadow-md sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 */}
          <Link to="/" className="flex-shrink-0 text-2xl font-bold text-red-600 dark:text-red-500">
            MovieApp
          </Link>

          {/* 데스크톱 내비게이션 및 검색 */}
          <div className="hidden md:flex items-center space-x-4">
            {/* 검색 바 */}
            <div ref={searchRef} className="relative flex">
              <form onSubmit={handleSearch} className="flex">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="영화 검색..."
                  className="w-64 px-3 py-2 rounded-l-md text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700">
                  {suggestions.map((item) => (
                    <div
                      key={item.movieId}
                      onClick={() => handleSuggestionClick(item.movieId)}
                      className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-700 last:border-b-0"
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

            {/* 내비게이션 링크 */}
            <Link to="/" className="text-gray-800 dark:text-white hover:text-red-600 dark:hover:text-red-500 px-3 py-2 rounded-md font-medium transition-colors">홈</Link>
            {isLoggedIn && (
              <Link to="/mypage" className="text-gray-800 dark:text-white hover:text-red-600 dark:hover:text-red-500 px-3 py-2 rounded-md font-medium transition-colors">마이페이지</Link>
            )}
            {isLoggedIn && userRole === 'ROLE_ADMIN' && (
              <Link to="/admin" className="text-gray-800 dark:text-white hover:text-red-600 dark:hover:text-red-500 px-3 py-2 rounded-md font-medium transition-colors">관리자</Link>
            )}

            {/* 인증 버튼 */}
            {isLoggedIn ? (
              <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors font-semibold">
                로그아웃
              </button>
            ) : (
              <>
                <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-semibold">로그인</Link>
                <Link to="/register" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-semibold">회원가입</Link>
              </>
            )}

            {/* 다크 모드 토글 */}
            <button onClick={toggleDarkMode} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>

          {/* 모바일 햄버거 메뉴 버튼 */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-md text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
              <span className="sr-only">메인 메뉴 열기</span>
              {isMobileMenuOpen ? (
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 (토글) */}
      <div ref={mobileMenuRef} className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'} bg-white dark:bg-gray-800 pb-4 border-t border-gray-200 dark:border-gray-700`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className={navLinkClass}>홈</Link>
          {isLoggedIn && (
            <Link to="/mypage" onClick={() => setIsMobileMenuOpen(false)} className={navLinkClass}>마이페이지</Link>
          )}
          {isLoggedIn && userRole === 'ROLE_ADMIN' && (
            <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className={navLinkClass}>관리자</Link>
          )}
        </div>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200 dark:border-gray-700">
          {/* 모바일 검색 바 */}
          <div ref={searchRef} className="relative mb-2">
            <form onSubmit={handleSearch} className="flex w-full">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="영화 검색..."
                className="w-full px-3 py-2 rounded-l-md text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700">
                {suggestions.map((item) => (
                  <div
                    key={item.movieId}
                    onClick={() => handleSuggestionClick(item.movieId)}
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-700 last:border-b-0"
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
          {isLoggedIn ? (
            <button onClick={handleLogout} className={`${authButtonClass} bg-red-600 hover:bg-red-700 text-white`}>
              로그아웃
            </button>
          ) : (
            <div className="flex flex-col space-y-2">
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className={`${authButtonClass} bg-blue-600 hover:bg-blue-700 text-white`}>로그인</Link>
              <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className={`${authButtonClass} bg-green-600 hover:bg-green-700 text-white`}>회원가입</Link>
            </div>
          )}
          <button onClick={toggleDarkMode} className={`${authButtonClass} bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600`}>
            {isDarkMode ? '☀️ 다크 모드' : '🌙 라이트 모드'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;