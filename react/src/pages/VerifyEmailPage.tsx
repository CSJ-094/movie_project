import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

const VerifyEmailPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [message, setMessage] = useState('이메일 인증을 처리 중입니다...');
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setMessage('유효하지 않은 인증 링크입니다.');
            return;
        }

        const verifyToken = async () => {
            try {
                const response = await axiosInstance.get(`/user/verify?token=${token}`);
                setMessage(response.data);
                setIsSuccess(true);
            } catch (err: any) {
                const errorMessage = err.response?.data || err.message || '인증에 실패했습니다. 다시 시도해주세요.';
                setMessage(errorMessage);
                setIsSuccess(false);
            }
        };

        verifyToken();
    }, [searchParams]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-center">
            <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-md">
                <h2 className={`text-2xl font-bold mb-4 ${isSuccess ? 'text-green-500' : 'text-red-500'}`}>
                    {message}
                </h2>
                {isSuccess && <Link to="/login" className="text-blue-500 hover:underline">로그인 페이지로 이동</Link>}
            </div>
        </div>
    );
};

export default VerifyEmailPage;