import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx'
import './index.css'
import SearchPage from './pages/SearchPage.tsx';
import MovieDetailPage from './pages/MovieDetailPage.tsx';
import MainPage from './pages/MainPage.tsx';
import BookingPage from './pages/BookingPage.tsx';
import SeatSelectionPage from './pages/SeatSelectionPage.tsx';
import PaymentPage from './pages/PaymentPage.tsx';
import PaymentSuccessPage from './pages/PaymentSuccessPage.tsx';
import PaymentFailPage from './pages/PaymentFailPage.tsx';
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
import ActorDetailPage from './pages/ActorDetailPage.tsx'; // ActorDetailPage 임포트 추가
// import ProfilePage from './pages/ProfilePage.tsx'; // ProfilePage 임포트 제거
import { AuthProvider } from './contexts/AuthContext.tsx';
import QuickMatchPage from './pages/QuickMatchPage.tsx';
import MovieListPage from './pages/MovieListPage.tsx'; // MovieListPage 임포트 추가
import ErrorPage from './pages/ErrorPage.tsx';


// 라우터(길잡이) 설정을 만듭니다.
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />, // 최상위 경로에 errorElement를 설정하여 모든 하위 경로의 에러를 처리합니다.
    // App 컴포넌트의 <Outlet>에 렌더링될 자식 경로들을 설정합니다.
    children: [
      {
        index: true, // 부모 경로('/')와 동일할 때 MainPage를 보여줍니다.
        element: <MainPage />,
      },
      {
        path: "booking", // '/booking' 경로
        element: <BookingPage />,
      },
      {
        path: "seat-selection", // '/seat-selection' 경로
        element: <SeatSelectionPage />,
      },
      {
        path: "payment", // '/payment' 경로
        element: <PaymentPage />,
      },
      {
        path: "payment/success", // '/payment/success' 경로
        element: <PaymentSuccessPage />,
      },
      {
        path: "payment/fail", // '/payment/fail' 경로
        element: <PaymentFailPage />,
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
        path: "person/:personId", // '/person/:personId' 경로 추가
        element: <ActorDetailPage />,
      },
      {
        path: "quickmatch",              
        element: <QuickMatchPage />,
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
      // [추가] AppHeader의 카테고리별 영화 목록 페이지 라우트
      {
        path: "movies/now-playing-page",
        element: <MovieListPage pageTitle="현재 상영중인 영화" fetchUrl="/movies/now-playing" />,
      },
      {
        path: "movies/popular-page",
        element: <MovieListPage pageTitle="인기 영화" fetchUrl="/movies/popular" />,
      },
      {
        path: "movies/top-rated-page",
        element: <MovieListPage pageTitle="높은 평점 영화" fetchUrl="/movies/top-rated" />,
      },
      {
        path: "movies/upcoming-page",
        element: <MovieListPage pageTitle="개봉 예정 영화" fetchUrl="/movies/upcoming" />,
      },
      {
        path: "movies/all-page",
        element: <MovieListPage pageTitle="모든 영화" fetchUrl="/movies/all" />,
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
