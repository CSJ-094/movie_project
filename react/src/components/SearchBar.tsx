import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const SearchBar: React.FC = () => {
  // 사용자가 입력한 검색어를 저장하기 위한 state
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  // 1. localStorage에서 저장된 값을 읽어와 초기 상태를 설정합니다.
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });

  // 2. isDarkMode 상태가 바뀔 때마다 <html> 태그에 'dark' 클래스를 토글하고, localStorage에 상태를 저장합니다.
  useEffect(() => {
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
  
  // input의 내용이 변경될 때마다 실행되는 함수
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // '검색' 버튼을 클릭했을 때 실행되는 함수
  const handleSearchClick = () => {
    // 검색어가 비어있지 않을 때만 /search 경로로 페이지를 이동시킵니다.
    // URL에 쿼리 파라미터(?q=...)로 검색어를 함께 전달합니다.
    if (searchTerm.trim() !== '') {
      navigate(`/search?q=${searchTerm}`);
    }
  };

  return (
    <header className="p-5 bg-gray-100 dark:bg-gray-800 text-center transition-colors">
      <div className="flex justify-between items-center max-w-5xl mx-auto mb-4">
        <Link to="/" className="no-underline text-gray-800 dark:text-white">
          <h1 className="text-3xl font-bold">My Movie App</h1>
        </Link>
        <button onClick={toggleDarkMode} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white">
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
      <div className="flex justify-center">
        <input
          type="text"
          placeholder="영화 제목을 검색하세요..."
          className="p-2 w-1/2 md:w-1/3 rounded-l-md border-0 text-black focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={searchTerm}
          onChange={handleInputChange}
        />
        <button onClick={handleSearchClick} className="p-2 px-4 bg-blue-500 rounded-r-md hover:bg-blue-600 transition-colors">
          검색
        </button>
      </div>
    </header>
  );
};

export default SearchBar;