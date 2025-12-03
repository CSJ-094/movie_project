import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

const RegisterPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(''); // 이름 상태 추가
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // axiosInstance의 baseURL에 /api가 포함되었으므로, 여기서는 /user/signup만 사용합니다.
            const response = await axiosInstance.post('/user/signup', { email, password, name });
            setSuccess(response.data);

        } catch (err: any) {
            // axios 에러는 err.response.data에 서버가 보낸 메시지가 담겨 있습니다.
            const errorMessage = err.response?.data || err.message || '회원가입에 실패했습니다.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">회원가입</h2>
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                {success && <p className="text-green-500 text-center mb-4">{success}</p>}
                
                {!success && (
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
                        <div className="mb-4">
                            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="name">
                                이름
                            </label>
                            <input
                                type="text" id="name" value={name} onChange={(e) => setName(e.target.value)}
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
                            {loading ? '가입 요청 중...' : '회원가입'}
                        </button>
                    </form>
                )}
                <p className="text-center mt-4 text-gray-600 dark:text-gray-400">
                    이미 계정이 있으신가요? <Link to="/login" className="text-blue-500 hover:underline">로그인</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;