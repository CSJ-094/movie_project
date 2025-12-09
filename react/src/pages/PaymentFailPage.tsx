import { useNavigate, useSearchParams } from 'react-router-dom';

export default function PaymentFailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorMessage = searchParams.get('message') || '결제에 실패했습니다.';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          결제 실패
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {errorMessage}
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            다시 시도
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold py-3 rounded-lg transition-colors"
          >
            메인으로
          </button>
        </div>
      </div>
    </div>
  );
}
