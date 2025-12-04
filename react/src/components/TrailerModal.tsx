import React from 'react';

interface TrailerModalProps {
  trailerKey: string;
  onClose: () => void;
}

const TrailerModal: React.FC<TrailerModalProps> = ({ trailerKey, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div className="relative w-11/12 md:w-3/4 lg:w-2/3 aspect-w-16 aspect-h-9" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full rounded-lg shadow-lg"
        ></iframe>
        <button
          onClick={onClose}
          className="absolute -top-10 -right-2 text-white text-4xl font-bold"
        >&times;</button>
      </div>
    </div>
  );
};

export default TrailerModal;
