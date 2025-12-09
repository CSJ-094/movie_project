import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadTossPayments } from '@tosspayments/payment-sdk';

interface PaymentState {
  movieTitle: string;
  theaterName: string;
  screenName: string;
  startTime: string;
  selectedSeats: string[];
  totalPrice: number;
  showtimeId?: number;
}

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as PaymentState;

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'kakaopay' | 'naverpay' | ''>('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 토스페이먼츠 클라이언트 키 (테스트용)
  const clientKey = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

  // 결제 처리
  const handlePayment = async () => {
    if (!paymentMethod) {
      alert('결제 수단을 선택해주세요.');
      return;
    }

    if (!agreeTerms) {
      alert('이용약관에 동의해주세요.');
      return;
    }

    setIsProcessing(true);

    try {
      // 토스페이먼츠 SDK 로드
      const tossPayments = await loadTossPayments(clientKey);

      // 주문 ID 생성 (실제로는 백엔드에서 생성해야 함)
      const orderId = `ORDER_${Date.now()}`;
      const orderName = `${state?.movieTitle} - ${state?.selectedSeats?.join(', ')}`;

      // 예매 정보를 URL 파라미터로 전달
      const bookingData = encodeURIComponent(JSON.stringify({
        showtimeId: state?.showtimeId,
        seats: state?.selectedSeats,
        seatCount: state?.selectedSeats?.length,
        totalPrice: 1, // 테스트용 1원
      }));

      // 결제 방식에 따라 다른 메서드 호출
      if (paymentMethod === 'card') {
        // 카드 결제 (테스트용 1원)
        await tossPayments.requestPayment('카드', {
          amount: 1,
          orderId: orderId,
          orderName: orderName,
          successUrl: `${window.location.origin}/payment/success?bookingData=${bookingData}`,
          failUrl: `${window.location.origin}/payment/fail`,
          customerName: '홍길동', // 실제로는 로그인한 사용자 정보
        });
      } else if (paymentMethod === 'kakaopay') {
        // 간편결제 (카카오페이 포함) (테스트용 1원)
        await tossPayments.requestPayment('토스페이', {
          amount: 1,
          orderId: orderId,
          orderName: orderName,
          successUrl: `${window.location.origin}/payment/success?bookingData=${bookingData}`,
          failUrl: `${window.location.origin}/payment/fail`,
          customerName: '홍길동',
        });
      } else if (paymentMethod === 'naverpay') {
        // 간편결제 (테스트용 1원)
        await tossPayments.requestPayment('토스페이', {
          amount: 1,
          orderId: orderId,
          orderName: orderName,
          successUrl: `${window.location.origin}/payment/success?bookingData=${bookingData}`,
          failUrl: `${window.location.origin}/payment/fail`,
          customerName: '홍길동',
        });
      }
    } catch (error) {
      console.error('결제 오류:', error);
      alert('결제 처리 중 오류가 발생했습니다.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-[1000px] mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">결제</h1>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 예매 정보 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 예매 정보 카드 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                예매 정보
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">영화</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {state?.movieTitle}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">극장</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {state?.theaterName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">상영관</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {state?.screenName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">상영시간</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {state?.startTime &&
                      new Date(state.startTime).toLocaleString('ko-KR', {
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">좌석</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {state?.selectedSeats?.join(', ')}
                  </span>
                </div>
                <div className="flex justify-between text-lg pt-3 border-t dark:border-gray-700">
                  <span className="font-bold text-gray-900 dark:text-white">
                    총 결제금액
                  </span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {state?.totalPrice?.toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>

            {/* 결제 수단 선택 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                결제 수단
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                    paymentMethod === 'card'
                      ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'card'
                        ? 'border-red-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {paymentMethod === 'card' && (
                      <div className="w-3 h-3 bg-red-600 rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      신용카드
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      국내 모든 신용카드 사용 가능
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentMethod('kakaopay')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                    paymentMethod === 'kakaopay'
                      ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'kakaopay'
                        ? 'border-red-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {paymentMethod === 'kakaopay' && (
                      <div className="w-3 h-3 bg-red-600 rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      카카오페이
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      간편하고 빠른 결제
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentMethod('naverpay')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                    paymentMethod === 'naverpay'
                      ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'naverpay'
                        ? 'border-red-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {paymentMethod === 'naverpay' && (
                      <div className="w-3 h-3 bg-red-600 rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      네이버페이
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      네이버페이 포인트 사용 가능
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 이용약관 동의 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                약관 동의
              </h2>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-5 h-5 mt-0.5 accent-red-600"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    개인정보 수집 및 이용약관 동의 (필수)
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    예매 서비스 제공을 위해 필요한 최소한의 개인정보를 수집합니다.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 오른쪽: 결제 요약 */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                결제 정보
              </h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    티켓 금액
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {state?.totalPrice?.toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">할인</span>
                  <span className="text-gray-900 dark:text-white">0원</span>
                </div>
                <div className="pt-3 border-t dark:border-gray-700">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900 dark:text-white">
                      최종 결제금액
                    </span>
                    <span className="font-bold text-xl text-red-600 dark:text-red-400">
                      {state?.totalPrice?.toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={isProcessing || !paymentMethod || !agreeTerms}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
                  isProcessing || !paymentMethod || !agreeTerms
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
                }`}
              >
                {isProcessing ? '결제 처리중...' : '결제하기'}
              </button>

              <button
                onClick={() => navigate(-1)}
                className="w-full mt-3 py-3 rounded-lg font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                이전으로
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
