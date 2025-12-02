import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const SearchBar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });

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
  
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSearch = () => {
    if (searchTerm.trim() !== '') {
      navigate(`/search?q=${searchTerm}`);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
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
          onKeyDown={handleKeyDown}
        />
        <button onClick={handleSearch} className="p-2 px-4 bg-blue-500 rounded-r-md hover:bg-blue-600 transition-colors">
          검색
        </button>
      </div>
    </header>
  );
};

export default SearchBar;
