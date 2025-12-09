import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

interface SeatSelectionState {
  movieTitle: string;
  theaterName: string;
  screenName: string;
  startTime: string;
  price: number;
  availableSeats: number;
  showtimeId?: number; // 상영시간표 ID 추가
  occupiedSeats?: string[]; // 예매완료된 좌석 정보 (예: ['A1', 'A2', 'B5'])
  totalSeats?: number;
  screenId?: number;
  screenType?: string;
}

interface Seat {
  row: string;
  number: number;
  status: 'available' | 'selected' | 'occupied';
}

export default function SeatSelectionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as SeatSelectionState;

  const [seats, setSeats] = useState<Seat[][]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>(state?.occupiedSeats || []);
  const [loading, setLoading] = useState(false);

  // 좌석 초기화 (A~P행, 각 행마다 15석) + 예매완료 좌석 API 호출
  useEffect(() => {
    const fetchOccupiedSeats = async () => {
      if (!state?.showtimeId) return;
      setLoading(true);
      try {
        const res = await axios.get<string[]>(`http://localhost:8484/api/bookings/showtime/${state.showtimeId}/booked-seats`);
        setOccupiedSeats(res.data);
      } catch (e) {
        setOccupiedSeats([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOccupiedSeats();
  }, [state?.showtimeId]);

  useEffect(() => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
    const seatLayout = rows.map((row) => {
      const rowSeats: Seat[] = [];
      for (let i = 1; i <= 15; i++) {
        const seatKey = `${row}${i}`;
        const isOccupied = occupiedSeats.includes(seatKey);
        rowSeats.push({
          row,
          number: i,
          status: isOccupied ? 'occupied' : 'available',
        });
      }
      return rowSeats;
    });
    setSeats(seatLayout);
  }, [occupiedSeats]);

  // 좌석 클릭 핸들러
  const handleSeatClick = (seat: Seat) => {
    // 예매완료된 좌석은 클릭 불가
    if (seat.status === 'occupied') return;

    const seatKey = `${seat.row}${seat.number}`;
    const isSelected = selectedSeats.some(
      (s) => `${s.row}${s.number}` === seatKey
    );

    if (isSelected) {
      // 선택 해제
      setSelectedSeats(selectedSeats.filter((s) => `${s.row}${s.number}` !== seatKey));
      setSeats(
        seats.map((row) =>
          row.map((s) =>
            `${s.row}${s.number}` === seatKey
              ? { ...s, status: 'available' as const }
              : s
          )
        )
      );
    } else {
      // 선택
      setSelectedSeats([...selectedSeats, seat]);
      setSeats(
        seats.map((row) =>
          row.map((s) =>
            `${s.row}${s.number}` === seatKey
              ? { ...s, status: 'selected' as const }
              : s
          )
        )
      );
    }
  };

  // 총 금액 계산
  const totalPrice = selectedSeats.length * (state?.price || 0);
  // 전체 좌석 수 및 남은 좌석 수 계산
  // 전체 좌석 수: state.totalSeats가 있으면 사용, 없으면 240
  const TOTAL_SEATS = state?.totalSeats || 16 * 15;
  // 선택 가능 좌석 = 전체 좌석 - 예매완료 좌석
  const availableSeats = TOTAL_SEATS - occupiedSeats.length;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            좌석 선택
          </h1>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* 좌석 현황 */}
        <div className="mb-4 flex gap-8">
          <div className="text-gray-700 dark:text-gray-300 font-semibold">선택 가능 좌석: {availableSeats} / {TOTAL_SEATS}</div>
        </div>
        {loading && <div className="text-center text-gray-500">좌석 정보를 불러오는 중...</div>}
        {/* 영화 정보 */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">영화</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {state?.movieTitle}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">극장</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {state?.theaterName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">상영관</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {state?.screenName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">상영시간</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {state?.startTime &&
                    new Date(state.startTime).toLocaleString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 스크린 */}
        <div className="mb-8">
          <div className="bg-gradient-to-b from-purple-600 to-purple-500 text-white text-center py-3 rounded-t-lg mb-12">
            <p className="text-lg font-bold tracking-wider">SCREEN</p>
          </div>

          {/* 좌석 배치 */}
          <div className="flex flex-col items-center gap-2">
            {seats.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center gap-2">
                {/* 행 라벨 */}
                <span className="w-8 text-center font-bold text-gray-700 dark:text-gray-300">
                  {row[0].row}
                </span>

                {/* 좌석들 */}
                {row.map((seat, seatIndex) => {
                  // 통로 공간 추가 (4번과 5번 사이, 11번과 12번 사이)
                  const showGap = seatIndex === 4 || seatIndex === 11;

                  return (
                    <div key={seatIndex} className="flex items-center">
                      {showGap && <div className="w-4" />}
                      <button
                        onClick={() => handleSeatClick(seat)}
                        disabled={seat.status === 'occupied'}
                        className={`w-7 h-7 rounded-sm transition-all ${
                          seat.status === 'available'
                            ? 'bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-400'
                            : seat.status === 'selected'
                            ? 'bg-purple-600 border-2 border-purple-700'
                            : 'bg-orange-500 border-2 border-orange-600 cursor-not-allowed'
                        }`}
                      />
                    </div>
                  );
                })}

                {/* 행 라벨 (오른쪽) */}
                <span className="w-8 text-center font-bold text-gray-700 dark:text-gray-300">
                  {row[0].row}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 범례 */}
        <div className="flex justify-center gap-8 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-sm" />
            <span className="text-sm text-gray-700 dark:text-gray-300">선택가능</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-purple-600 border-2 border-purple-700 rounded-sm" />
            <span className="text-sm text-gray-700 dark:text-gray-300">선택됨</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-500 border-2 border-orange-600 rounded-sm" />
            <span className="text-sm text-gray-700 dark:text-gray-300">예매완료</span>
          </div>
        </div>

        {/* 하단 고정 바 */}
        {selectedSeats.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg">
            <div className="max-w-[1200px] mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      선택 좌석
                    </p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {selectedSeats
                        .map((s) => `${s.row}${s.number}`)
                        .join(', ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      총 금액
                    </p>
                    <p className="font-bold text-red-600 dark:text-red-400 text-xl">
                      {totalPrice.toLocaleString()}원
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => navigate(-1)}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => {
                      navigate('/payment', {
                        state: {
                          movieTitle: state?.movieTitle,
                          theaterName: state?.theaterName,
                          screenName: state?.screenName,
                          startTime: state?.startTime,
                          selectedSeats: selectedSeats.map((s) => `${s.row}${s.number}`),
                          totalPrice,
                          showtimeId: state?.showtimeId,
                        },
                      });
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-12 rounded-lg text-lg transition-colors shadow-lg"
                  >
                    결제하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
