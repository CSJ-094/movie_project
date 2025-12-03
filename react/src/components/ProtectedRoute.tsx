import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute: React.FC = () => {
    const { isLoggedIn } = useAuth();

    if (!isLoggedIn) {
        // 사용자가 로그인하지 않았으면 로그인 페이지로 리디렉션합니다.
        // 'replace' 옵션은 브라우저 히스토리에 현재 경로를 남기지 않습니다.
        alert('로그인이 필요한 페이지입니다.');
        return <Navigate to="/login" replace />;
    }

    // 로그인한 사용자라면 요청된 페이지(자식 라우트)를 렌더링합니다.
    return <Outlet />;
};

export default ProtectedRoute;