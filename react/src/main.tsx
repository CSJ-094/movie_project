import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx'
import './index.css'
import SearchPage from './pages/SearchPage.tsx';
import MovieDetailPage from './pages/MovieDetailPage.tsx';
import MainPage from './pages/MainPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import VerifyEmailPage from './pages/VerifyEmailPage.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import MyPage from './pages/MyPage.tsx';
import RecapPage from './pages/RecapPage.tsx'; // RecapPage 임포트 추가
import AdminRoute from './components/AdminRoute.tsx';
import AdminPage from './pages/AdminPage.tsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';
import OAuth2CallbackPage from './pages/OAuth2CallbackPage.tsx';
// import ProfilePage from './pages/ProfilePage.tsx'; // ProfilePage 임포트 제거
import { AuthProvider } from './contexts/AuthContext.tsx';


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
      {
        path: "login", // '/login' 경로
        element: <LoginPage />,
      },
      {
        path: "register", // '/register' 경로
        element: <RegisterPage />,
      },
      {
        path: "verify-email", // '/verify-email' 경로
        element: <VerifyEmailPage />,
      },
      {
        path: "forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        path: "reset-password",
        element: <ResetPasswordPage />,
      },
      {
        path: "oauth2/callback",
        element: <OAuth2CallbackPage />,
      },
      // 보호된 라우트 설정
      {
        element: <ProtectedRoute />,
        children: [
          { path: "mypage", element: <MyPage /> },
          { path: "recap", element: <RecapPage /> }, // RecapPage 라우트 추가
          // { path: "profile", element: <ProfilePage /> }, // ProfilePage 라우팅 제거
        ],
      },
      // 관리자 전용 라우트 설정
      {
        element: <AdminRoute />,
        children: [
          { path: "admin", element: <AdminPage /> },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
)
