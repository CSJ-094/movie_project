import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { AxiosError } from 'axios';
import { QRCode } from 'react-qr-code'; // react-qr-code 임포트

// 백엔드 QrSessionStatusResponse.QrAuthStatus와 동일하게 정의
enum QrAuthStatus {
    PENDING = 'PENDING',
    AUTHENTICATED = 'AUTHENTICATED',
    FAILED = 'FAILED',
    EXPIRED = 'EXPIRED',
}

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loginMethod, setLoginMethod] = useState<'email' | 'qr'>('email'); // 로그인 방식 선택 상태
    const navigate = useNavigate();
    const { login } = useAuth();

    // QR 로그인 관련 상태
    const [qrSessionId, setQrSessionId] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState<boolean>(false);
    const [qrError, setQrError] = useState<string | null>(null);
    const [qrAuthStatus, setQrAuthStatus] = useState<QrAuthStatus>(QrAuthStatus.PENDING);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null); // 폴링 인터벌 ID 저장

    // 이메일 로그인 처리
    const handleEmailSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await axiosInstance.post('/user/login', { email, password });
            login(response.data.accessToken, navigate);
        } catch (err) {
            let displayMessage = '로그인에 실패했습니다. 다시 시도해주세요.';
            if (err instanceof AxiosError && err.response) {
                if (typeof err.response.data === 'object' && err.response.data.message) {
                    displayMessage = err.response.data.message;
                } else if (typeof err.response.data === 'string' && err.response.data) {
                    displayMessage = err.response.data;
                }
            }
            setError(displayMessage);
        } finally {
            setLoading(false);
        }
    };

    // QR 세션 생성 및 폴링 시작 함수
    const startQrLoginProcess = async () => {
        setQrLoading(true);
        setQrError(null);
        setQrAuthStatus(QrAuthStatus.PENDING);
        setQrSessionId(null); // 초기화

        // 기존 폴링이 있다면 정리
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }

        try {
            // 1. 백엔드로부터 QR 세션 ID 생성 요청
            const sessionResponse = await axiosInstance.post<{ sessionId: string; message: string }>('/qr-auth/session');
            const newSessionId = sessionResponse.data.sessionId;
            setQrSessionId(newSessionId); // 여기서 qrSessionId가 설정됨
            setQrLoading(false);

            // 2. 인증 상태 폴링 시작 (newSessionId를 받은 직후에 시작)
            pollingIntervalRef.current = setInterval(async () => {
                try {
                    const statusResponse = await axiosInstance.get<{
                        sessionId: string;
                        status: QrAuthStatus;
                        token?: string;
                        message: string;
                    }>(`/qr-auth/status/${newSessionId}`); // newSessionId 사용

                    const currentStatus = statusResponse.data.status;
                    setQrAuthStatus(currentStatus);

                    if (currentStatus === QrAuthStatus.AUTHENTICATED) {
                        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                        console.log('User authenticated via QR!');
                        if (login && statusResponse.data.token) {
                            login(statusResponse.data.token, navigate);
                        }
                    } else if (currentStatus === QrAuthStatus.FAILED || currentStatus === QrAuthStatus.EXPIRED) {
                        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                        setQrError(`QR 인증 ${currentStatus === QrAuthStatus.FAILED ? '실패' : '만료'}. 다시 시도해주세요.`);
                    }
                } catch (pollError) {
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    console.error('QR 인증 상태 폴링 중 오류 발생:', pollError);
                    setQrError('QR 인증 상태를 확인할 수 없습니다. 다시 시도해주세요.');
                }
            }, 3000); // 3초마다 폴링

        } catch (err) {
            console.error('QR 세션 생성 중 오류 발생:', err);
            setQrError('QR 세션을 생성할 수 없습니다. 백엔드 서버를 확인해주세요.');
            setQrLoading(false);
        }
    };

    // loginMethod 변경 시 QR 로그인 프로세스 시작/정리
    useEffect(() => {
        if (loginMethod === 'qr') {
            // startQrLoginProcess는 비동기적으로 sessionId를 설정하고 폴링을 시작합니다.
            startQrLoginProcess();
        } else {
            // 이메일 탭으로 돌아가면 폴링 정리
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            setQrSessionId(null);
            setQrError(null);
            setQrAuthStatus(QrAuthStatus.PENDING);
        }
        // 컴포넌트 언마운트 시 폴링 정리
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [loginMethod]); // qrSessionId를 의존성 배열에서 제거


    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">로그인</h2>

                {/* 로그인 방식 선택 탭 */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                    <button
                        onClick={() => setLoginMethod('email')}
                        className={`flex-1 py-2 text-center font-semibold ${loginMethod === 'email' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        이메일 로그인
                    </button>
                    <button
                        onClick={() => setLoginMethod('qr')}
                        className={`flex-1 py-2 text-center font-semibold ${loginMethod === 'qr' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        QR 코드 로그인
                    </button>
                </div>

                {error && <p className="text-red-500 text-center mb-4">{error}</p>}

                {/* 이메일 로그인 폼 */}
                {loginMethod === 'email' && (
                    <form onSubmit={handleEmailSubmit}>
                        <div className="mb-4">
                            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="email">
                                이메일
                            </label>
                            <input
                                type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="password">
                                비밀번호
                            </label>
                            <input
                                type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300">
                            {loading ? '로그인 중...' : '로그인'}
                        </button>
                    </form>
                )}

                {/* QR 코드 로그인 영역 */}
                {loginMethod === 'qr' && (
                    <div className="flex flex-col items-center justify-center min-h-[256px]">
                        {qrLoading ? (
                            <p className="text-gray-500 dark:text-gray-400">QR 코드 생성 중...</p>
                        ) : qrError ? (
                            <div className="text-red-500 text-center">
                                <p>{qrError}</p>
                                <button onClick={startQrLoginProcess} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                                    다시 시도
                                </button>
                            </div>
                        ) : qrSessionId ? (
                            <>
                                <QRCode value={qrSessionId} size={256} level="H" />
                                {/* 여기에 sessionId 표시 추가 */}
                                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 break-all">
                                    세션 ID: <span className="font-mono text-gray-700 dark:text-gray-200">{qrSessionId}</span>
                                </p>
                                <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
                                    모바일 앱으로 QR 코드를 스캔하여<br/>간편하게 로그인하세요.
                                </p>
                                {qrAuthStatus === QrAuthStatus.PENDING && (
                                    <p className="text-blue-500 mt-2">인증 대기 중...</p>
                                )}
                                {qrAuthStatus === QrAuthStatus.AUTHENTICATED && (
                                    <p className="text-green-500 mt-2">인증 성공! 리디렉션 중...</p>
                                )}
                            </>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400">QR 코드 로드 실패</p>
                        )}
                    </div>
                )}

                <div className="mt-6 flex items-center justify-between">
                    <span className="border-b w-1/5 lg:w-1/4 dark:border-gray-600"></span>
                    <span className="text-xs text-center text-gray-500 uppercase dark:text-gray-400">또는 소셜 로그인</span>
                    <span className="border-b w-1/5 lg:w-1/4 dark:border-gray-600"></span>
                </div>

                <div className="mt-6 space-y-3">
                    <a href="http://localhost:8484/oauth2/authorization/google" className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 transition-colors">
                        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                        Google로 계속하기
                    </a>
                    <a href="http://localhost:8484/oauth2/authorization/kakao" className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-[#FEE500] hover:bg-[#FDD835] transition-colors">
                        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C5.9 3 1 6.9 1 11.8c0 3.2 2.1 6 5.4 7.6-.2.8-.8 2.8-.9 3.2 0 0-.1.2.1.3.2.1.5 0 .5 0 .6-.4 2.6-1.7 3.6-2.4.8.1 1.6.2 2.4.2 6.1 0 11-3.9 11-8.8S18.1 3 12 3z" /></svg>
                        카카오로 계속하기
                    </a>
                    <a href="http://localhost:8484/oauth2/authorization/naver" className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#03C75A] hover:bg-[#02B351] transition-colors">
                        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z" /></svg>
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