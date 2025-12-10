import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { AxiosError } from 'axios';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await axiosInstance.post('/user/login', { email, password });

            login(response.data.accessToken, navigate); // AuthContext의 login 함수 호출

        } catch (err) {
            let displayMessage = '로그인에 실패했습니다. 다시 시도해주세요.';

            if (err instanceof AxiosError && err.response) {
                // 백엔드에서 { message: "..." } 형태의 객체로 응답이 올 경우
                if (typeof err.response.data === 'object' && err.response.data.message) {
                    displayMessage = err.response.data.message;
                // 백엔드에서 텍스트로만 응답이 올 경우
                } else if (typeof err.response.data === 'string' && err.response.data) {
                    displayMessage = err.response.data;
                }
            }

            setError(displayMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">로그인</h2>
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="email">
                            이메일
                        </label>
                        <input
                            type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="password">
                            비밀번호
                        </label>
                        <input
                            type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300">
                        {loading ? '로그인 중...' : '로그인'}
                    </button>
                </form>

                <div className="mt-6 flex items-center justify-between">
                    <span className="border-b w-1/5 lg:w-1/4 dark:border-gray-600"></span>
                    <span className="text-xs text-center text-gray-500 uppercase dark:text-gray-400">또는 소셜 로그인</span>
                    <span className="border-b w-1/5 lg:w-1/4 dark:border-gray-600"></span>
                </div>

                <div className="mt-6 space-y-3">
                    <a href="http://localhost:8484/oauth2/authorization/google" className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 transition-colors">
                        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google로 계속하기
                    </a>
                    <a href="http://localhost:8484/oauth2/authorization/kakao" className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-[#FEE500] hover:bg-[#FDD835] transition-colors">
                        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3C5.9 3 1 6.9 1 11.8c0 3.2 2.1 6 5.4 7.6-.2.8-.8 2.8-.9 3.2 0 0-.1.2.1.3.2.1.5 0 .5 0 .6-.4 2.6-1.7 3.6-2.4.8.1 1.6.2 2.4.2 6.1 0 11-3.9 11-8.8S18.1 3 12 3z" />
                        </svg>
                        카카오로 계속하기
                    </a>
                    <a href="http://localhost:8484/oauth2/authorization/naver" className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#03C75A] hover:bg-[#02B351] transition-colors">
                        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z" />
                        </svg>
                        네이버로 계속하기
                    </a>
                </div>
                <p className="text-center mt-4 text-gray-600 dark:text-gray-400">
                    계정이 없으신가요? <Link to="/register" className="text-blue-500 hover:underline">회원가입</Link>
                </p>
                <p className="text-center mt-2 text-sm text-gray-500">
                    <Link to="/forgot-password" className="hover:underline">비밀번호를 잊으셨나요?</Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;