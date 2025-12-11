import React from 'react';
import { Outlet } from 'react-router-dom'; 
import Header from './components/Header'; // SearchBar 대신 Header 임포트

function App() {
  return (
    <div className="App bg-white dark:bg-gray-900 min-h-screen transition-colors">
      <Header /> {/* SearchBar 대신 Header 렌더링 */}
      <Outlet />
    </div>
  );
}

export default App;