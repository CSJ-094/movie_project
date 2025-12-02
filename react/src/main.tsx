import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx'
import './index.css'
import SearchPage from './pages/SearchPage.tsx';
import MovieDetailPage from './pages/MovieDetailPage.tsx';
import MainPage from './pages/MainPage.tsx';


// 라우터(길잡이) 설정을 만듭니다.
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    // App 컴포넌트의 <Outlet>에 렌더링될 자식 경로들을 설정합니다.
    children: [
      {
        index: true, // 부모 경로('/')와 동일할 때 MainPage를 보여줍니다.
        element: <MainPage />,
      },
      {
        path: "search", // '/search' 경로
        element: <SearchPage />,
      },
      {
        path: "movie/:movieId", // '/movie/:movieId' 경로
        element: <MovieDetailPage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)