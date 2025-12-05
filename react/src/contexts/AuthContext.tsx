import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

// 토큰에서 추출한 사용자 정보 타입
interface DecodedToken {
    sub: string; // 이메일
    auth: string; // 역할 (e.g., "ROLE_USER")
    exp: number; // 만료 시간
}

// useNavigate 훅의 반환 타입을 사용하여 navigate 함수의 타입을 정의합니다.
type NavigateFunction = ReturnType<typeof useNavigate>;

// Context가 제공할 값들에 대한 타입
interface AuthContextType {
    isLoggedIn: boolean;
    userEmail: string | null;
    userRole: string | null;
    login: (token: string, navigate: NavigateFunction) => void; // 타입은 그대로 사용합니다.
    logout: (navigate: NavigateFunction) => void;
}

// Context 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Context를 제공하는 Provider 컴포넌트
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true); // 초기 인증 상태 확인 중 로딩 상태

    useEffect(() => {
        // 앱 시작 시 localStorage에서 토큰을 확인
        const storedToken = localStorage.getItem('accessToken');
        if (storedToken) {
            try {
                const decoded = jwtDecode<DecodedToken>(storedToken);
                // 토큰이 만료되지 않았다면 상태 업데이트
                if (decoded.exp * 1000 > Date.now()) {
                    setToken(storedToken);
                    setUserEmail(decoded.sub);
                    setUserRole(decoded.auth);
                } else {
                    // 만료되었다면 토큰 제거
                    localStorage.removeItem('accessToken');
                }
            } catch (error) {
                console.error("Invalid token:", error);
                localStorage.removeItem('accessToken');
            }
        }
        // 토큰 확인 작업이 끝났으므로 로딩 상태를 false로 변경
        setIsLoading(false);
    }, []);

    const login = (newToken: string, navigate: NavigateFunction) => {
        localStorage.setItem('accessToken', newToken);
        setToken(newToken);
        const decoded = jwtDecode<DecodedToken>(newToken);
        setUserEmail(decoded.sub);
        setUserRole(decoded.auth);
        navigate('/'); // 로그인 성공 시 메인 페이지로 이동
    };

    const logout = (navigate: NavigateFunction) => {
        if (window.confirm('정말 로그아웃 하시겠습니까?')) {
            localStorage.removeItem('accessToken');
            setToken(null);
            setUserEmail(null);
            setUserRole(null);
            navigate('/login'); // 로그아웃 후 로그인 페이지로 이동
        }
    };

    const isLoggedIn = !!token;

    // 초기 인증 상태를 확인하는 동안에는 아무것도 렌더링하지 않거나 로딩 스피너를 보여줍니다.
    if (isLoading) {
        return null; // 또는 <LoadingSpinner /> 같은 로딩 컴포넌트
    }

    return (
        <AuthContext.Provider value={{ isLoggedIn, userEmail, userRole, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// Context를 쉽게 사용하기 위한 커스텀 훅
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};