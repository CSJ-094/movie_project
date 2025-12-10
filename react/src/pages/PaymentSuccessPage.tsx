
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axiosInstance';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isConfirming, setIsConfirming] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState({
    paymentKey: '',
    orderId: '',
    amount: 0,
    bookingId: 0
  });
  const hasConfirmed = useRef(false); // 중복 실행 방지
  const { userEmail } = useAuth();

  useEffect(() => {
    const confirmPayment = async () => {
      if (hasConfirmed.current) return;
      hasConfirmed.current = true;
      try {
        // 결제 파라미터 추출
        const paymentKey = searchParams.get('paymentKey') || '';
        const orderId = searchParams.get('orderId') || '';
        const amount = Number(searchParams.get('amount')) || 0;
        const bookingDataParam = searchParams.get('bookingData');

        let bookingData = null;
        if (bookingDataParam) {
          try {
            bookingData = JSON.parse(decodeURIComponent(bookingDataParam));
          } catch (error) {
            console.error('예매 정보 파싱 실패:', error);
          }
        }

        // 사용자 프로필에서 userId 조회 (axiosInstance 사용)
        let userId = null;
        try {
          const profileRes = await axiosInstance.get('http://localhost:8484/api/user/profile');
          userId = profileRes.data.id;
        } catch (e) {
          console.error('사용자 프로필 조회 실패:', e);
          alert('로그인 정보 확인에 실패했습니다. 다시 로그인 해주세요.');
          setIsConfirming(false);
          return;
        }

        // 예매 정보 저장 (axiosInstance 사용)
        let bookingId = 0;
        if (bookingData && bookingData.showtimeId && userId) {
          try {
            const bookingRes = await axiosInstance.post('http://localhost:8484/api/bookings', {
              userId,
              showtimeId: bookingData.showtimeId,
              seats: bookingData.seats,
              seatCount: bookingData.seatCount,
              totalPrice: bookingData.totalPrice,
              bookingStatus: 'CONFIRMED'
            });
            bookingId = bookingRes.data.bookingId;
          } catch (error) {
            console.error('예매 저장 실패:', error);
            alert('예매 저장에 실패했습니다.');
            setIsConfirming(false);
            return;
          }
        } else {
          alert('예매 정보가 누락되었습니다. 다시 시도해주세요.');
          setIsConfirming(false);
          return;
        }

        // 결제 정보 저장 (axiosInstance 사용)
        try {
          await axiosInstance.post('http://localhost:8484/api/payment/confirm', {
            paymentKey,
            orderId,
            amount,
            userId,
            bookingId,
            method: '카드',
            orderName: '영화 예매'
          });
        } catch (error) {
          console.error('결제 승인 실패:', error);
          alert('결제 승인에 실패했습니다.');
          setIsConfirming(false);
          return;
        }

        setPaymentInfo({ paymentKey, orderId, amount, bookingId });
        setIsConfirming(false);
      } catch (error) {
        setIsConfirming(false);
      }
    };
    confirmPayment();
  }, []); // 최초 1회만 실행

  const handleCancel = async () => {
    // ...existing code...
  };

  if (isConfirming) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">결제 승인 처리중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          결제가 완료되었습니다!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          예매가 정상적으로 완료되었습니다.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            메인으로
          </button>
          <button
            onClick={() => navigate('/mypage')}
            className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold py-3 rounded-lg transition-colors"
          >
            예매 내역 확인
          </button>
          <button
            onClick={handleCancel}
            disabled={isCanceling}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors"
          >
            {isCanceling ? '취소 처리중...' : '결제 취소'}
          </button>
        </div>
      </div>
    </div>
  );
}
