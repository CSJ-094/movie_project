import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminRoute: React.FC = () => {
    const { isLoggedIn, userRole } = useAuth();

    if (!isLoggedIn) {
        alert('로그인이 필요한 페이지입니다.');
        return <Navigate to="/login" replace />;
    }

    if (userRole !== 'ROLE_ADMIN') {
        alert('관리자만 접근할 수 있는 페이지입니다.');
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default AdminRoute;