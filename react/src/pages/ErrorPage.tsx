import React from 'react';
import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';

const ErrorPage: React.FC = () => {
  // React Router가 제공하는 훅을 사용해 에러 객체를 가져옵니다.
  const error = useRouteError();
  console.error(error); // 개발 중 디버깅을 위해 에러를 콘솔에 출력합니다.

  let statusCode = 500;
  let statusText = 'Internal Server Error';
  let message = '죄송합니다. 예상치 못한 오류가 발생했습니다.';

  // isRouteErrorResponse를 사용해 HTTP 응답 에러인지 확인합니다.
  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    statusText = error.statusText;

    switch (error.status) {
      case 400:
        message = '잘못된 요청입니다. 입력하신 정보를 다시 확인해주세요.';
        break;
      case 401:
        message = '인증이 필요합니다. 로그인 후 다시 시도해주세요.';
        break;
      case 403:
        message = '이 페이지에 접근할 권한이 없습니다.';
        break;
      case 404:
        message = '요청하신 페이지를 찾을 수 없습니다.';
        break;
      default:
        message = `서버에서 오류가 발생했습니다. (${error.status})`;
        break;
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900 text-center px-4">
      <h1 className="text-8xl font-bold text-red-600">{statusCode}</h1>
      <h2 className="mt-4 text-3xl font-semibold text-gray-800 dark:text-white">{statusText}</h2>
      <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
        {message}
      </p>
      <Link
        to="/"
        className="mt-8 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
};

export default ErrorPage;