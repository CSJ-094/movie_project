import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { AxiosError } from 'axios';

const QrMobileSimulatorPage: React.FC = () => {
  const [sessionId, setSessionId] = useState('');
  const [mobileAuthToken, setMobileAuthToken] = useState(''); // mobileAuthToken 추가
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setResponseMessage(null);
    setIsSuccess(null);

    try {
      const response = await axiosInstance.post('/qr-auth/authenticate', {
        sessionId,
        mobileAuthToken, // mobileAuthToken 전송
      });
      setResponseMessage(`인증 성공: ${response.data.message}`);
      setIsSuccess(true);
      console.log('QR 인증 시뮬레이터 응답:', response.data);
    } catch (err) {
      let displayMessage = '인증 요청 실패. 백엔드 로그를 확인하세요.';
      if (err instanceof AxiosError && err.response) {
        if (typeof err.response.data === 'object' && err.response.data.message) {
          displayMessage = `인증 실패: ${err.response.data.message}`;
        } else if (typeof err.response.data === 'string' && err.response.data) {
          displayMessage = `인증 실패: ${err.response.data}`;
        } else {
          displayMessage = `인증 실패: ${err.response.status} ${err.response.statusText}`;
        }
      } else if (err instanceof Error) {
        displayMessage = `인증 실패: ${err.message}`;
      }
      setResponseMessage(displayMessage);
      setIsSuccess(false);
      console.error('QR 인증 시뮬레이터 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
          QR 모바일 인증 시뮬레이터
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
          웹 페이지에 표시된 QR 코드의 세션 ID와 모바일 인증 토큰을 입력하여 인증을 시도합니다.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="sessionId">
              QR 세션 ID
            </label>
            <input
              type="text"
              id="sessionId"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="웹 페이지의 QR 코드 아래 세션 ID를 입력하세요"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="mobileAuthToken">
              모바일 인증 토큰 (JWT)
            </label>
            <input
              type="text"
              id="mobileAuthToken"
              value={mobileAuthToken}
              onChange={(e) => setMobileAuthToken(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="모바일 앱에 로그인된 사용자의 JWT 토큰을 붙여넣으세요"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:bg-green-300"
          >
            {loading ? '인증 요청 중...' : 'QR 인증 요청'}
          </button>
        </form>

        {responseMessage && (
          <div
            className={`mt-6 p-3 rounded-lg text-center ${
              isSuccess ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {responseMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default QrMobileSimulatorPage;
