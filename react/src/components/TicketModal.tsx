
import React from 'react';
import QRCode from 'react-qr-code';

interface TicketModalProps {
  booking: any;
  onClose: () => void;
}

const TicketModal: React.FC<TicketModalProps> = ({ booking, onClose }) => {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="flex flex-col items-center w-full max-w-[320px]">
        {/* 카드 영역 */}
        <div className="bg-white rounded-2xl shadow-2xl w-full relative flex flex-col items-center p-0">
          <button
            className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold z-10"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
          {/* 포스터 */}
          <img
            src={booking.posterPath ? `https://image.tmdb.org/t/p/w300${booking.posterPath}` : 'https://via.placeholder.com/200x300?text=No+Image'}
            alt={booking.movieTitle}
            className="w-full h-[200px] object-cover rounded-t-2xl"
            style={{ maxHeight: 240, minHeight: 160 }}
          />
          {/* 정보 카드+QR */}
          <div className="w-full bg-white rounded-b-2xl p-2 flex flex-col items-start">
            <div className="flex w-full justify-between items-center mb-1">
              <span className="font-bold text-sm truncate max-w-[70%]">{booking.movieTitle}</span>
              <span className="text-blue-600 font-bold text-sm">1매</span>
            </div>
            <div className="text-xs text-gray-700 mb-1">{booking.theaterName} ({booking.screenName})</div>
            <div className="text-xs text-gray-700 mb-1">{new Date(booking.startTime).toLocaleString()}</div>
            <div className="text-xs text-gray-700 mb-1">좌석: {booking.seats.join(', ')}</div>
            <div className="text-xs text-gray-500 mb-2">예매번호: {booking.bookingId}</div>
            <div className="w-full flex flex-col items-center">
              <div className="bg-white p-1 rounded shadow border">
                <QRCode value={String(booking.bookingId)} size={72} />
              </div>
              <div className="text-[10px] text-gray-400 mt-1">이 티켓을 극장 입장 시 제시하세요.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
