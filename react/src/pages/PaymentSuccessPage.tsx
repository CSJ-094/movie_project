import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

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

  useEffect(() => {
    const confirmPayment = async () => {
      // 이미 실행되었으면 중단
      if (hasConfirmed.current) {
        console.log('이미 예매가 처리되었습니다.');
        return;
      }
      hasConfirmed.current = true;
      const paymentKey = searchParams.get('paymentKey') || '';
      const orderId = searchParams.get('orderId') || '';
      const amount = Number(searchParams.get('amount')) || 0;
      const bookingDataParam = searchParams.get('bookingData');
      
      let bookingData = null;
      if (bookingDataParam) {
        try {
          bookingData = JSON.parse(decodeURIComponent(bookingDataParam));
          console.log('예매 정보:', bookingData);
          console.log('showtimeId 확인:', bookingData.showtimeId);
        } catch (error) {
          console.error('예매 정보 파싱 실패:', error);
        }
      }

      try {
        // 1. 먼저 예매 정보 저장 (백엔드 Booking 테이블에 저장)
        let bookingId = 1; // 기본값
        
        if (bookingData && bookingData.showtimeId) {
          console.log('예매 생성 시작...');
          try {
            const bookingResponse = await axios.post('http://localhost:8484/api/bookings', {
              userId: 1, // TODO: 실제 로그인된 사용자 ID로 변경
              showtimeId: bookingData.showtimeId,
              seats: bookingData.seats, // 배열 그대로 전달
              seatCount: bookingData.seatCount,
              totalPrice: bookingData.totalPrice,
              bookingStatus: 'CONFIRMED'
            });
            
            bookingId = bookingResponse.data.bookingId;
            console.log('예매 저장 완료, bookingId:', bookingId);
          } catch (error) {
            console.error('예매 저장 실패:', error);
            throw error; // 예매 실패시 결제도 중단
          }
        } else {
          console.error('예매 데이터 누락! bookingData:', bookingData);
          alert('예매 정보가 누락되었습니다. 다시 시도해주세요.');
          return;
        }

        // 2. 결제 정보 저장
        const response = await axios.post('http://localhost:8484/api/payment/confirm', {
          paymentKey,
          orderId,
          amount,
          userId: 1, // TODO: 실제 로그인된 사용자 ID로 변경
          bookingId: bookingId,
          method: '카드', // TODO: 실제 결제 수단으로 변경
          orderName: '영화 예매' // TODO: 실제 주문명으로 변경
        });

        console.log('결제 승인 완료:', response.data);
        setPaymentInfo({ paymentKey, orderId, amount, bookingId });
        setIsConfirming(false);
      } catch (error) {
        console.error('결제 승인 실패:', error);
        alert('결제 승인에 실패했습니다. 고객센터로 문의해주세요.');
        setIsConfirming(false);
      }
    };

    confirmPayment();
  }, [searchParams]);

  const handleCancel = async () => {
    if (!confirm('정말로 결제를 취소하시겠습니까?')) {
      return;
    }

    setIsCanceling(true);
    try {
      await axios.post('http://localhost:8484/api/payment/cancel', {
        paymentKey: paymentInfo.paymentKey,
        cancelReason: '고객 요청'
      });
      
      alert('결제가 취소되었습니다.');
      navigate('/');
    } catch (error) {
      console.error('결제 취소 실패:', error);
      alert('결제 취소에 실패했습니다.');
    } finally {
      setIsCanceling(false);
    }
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
