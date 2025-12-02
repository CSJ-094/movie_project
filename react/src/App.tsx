// c:/dev/work_springboot/movie-frontend/src/App.tsx
import React from 'react';
import { Outlet } from 'react-router-dom'; 
import SearchBar from './components/SearchBar'; 

function App() {
  return (
    <div className="App bg-white dark:bg-gray-900 min-h-screen transition-colors">
      <SearchBar />
      <Outlet />
    </div>
  );
}

export default App;
