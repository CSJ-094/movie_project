import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            const response = await axiosInstance.post('/user/password-reset-request', email, {
                headers: { 'Content-Type': 'text/plain' } // 백엔드에서 String으로 받으므로
            });
            setMessage(response.data);
        } catch (err: any) {
            const errorMessage = err.response?.data || err.message || '요청에 실패했습니다.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">비밀번호 찾기</h2>
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                {message && <p className="text-green-500 text-center mb-4">{message}</p>}
                {!message && (
                    <form onSubmit={handleSubmit}>
                        <p className="text-center mb-4 text-gray-600 dark:text-gray-400">가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.</p>
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
                        <button type="submit" disabled={loading} className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300">
                            {loading ? '요청 중...' : '재설정 링크 받기'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPasswordPage;