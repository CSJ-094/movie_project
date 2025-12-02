import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

// 영화 상세 정보에 대한 타입을 정의합니다.
interface MovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  release_date: string;
  vote_average: number;
  genres: { id: number; name: string }[];
}
// 영상 정보에 대한 타입을 추가합니다.
interface Video {
  key: string;
  site: string;
  type: string;
  name: string;
}

const MovieDetailPage: React.FC = () => {
  // 1. useParams를 사용해 URL의 :movieId 값을 가져옵니다.
  const { movieId } = useParams<{ movieId: string }>();
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  // 트레일러 영상의 키를 저장할 state를 추가합니다.
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!movieId) return;

    const fetchMovieDetails = async () => {
      setLoading(true);
      try {
        // Promise.all을 사용해 상세 정보와 영상 정보를 동시에 요청합니다.
        const [detailsResponse, videosResponse] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb&language=ko-KR`),
          fetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb`)
        ]);

        const detailsData = await detailsResponse.json();
        const videosData = await videosResponse.json();

        setMovie(detailsData);

        // 응답받은 영상 목록에서 보여줄 영상을 찾습니다. (더 유연한 방식으로)
        // 1. 'Trailer'를 우선적으로 찾습니다.
        // 2. 없다면 'Teaser'를 찾습니다.
        // 3. 그것도 없다면 유튜브 영상 중 첫 번째 것을 선택합니다.
        const officialTrailer = videosData.results.find((video: Video) => video.type === 'Trailer')
          || videosData.results.find((video: Video) => video.type === 'Teaser')
          || videosData.results.find((video: Video) => video.site === 'YouTube');

        if (officialTrailer) {
          setTrailerKey(officialTrailer.key);
        }

      } catch (error) {
        console.error("Failed to fetch movie details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieDetails();
  }, [movieId]); // movieId가 바뀔 때마다 API를 다시 호출합니다.

  const handleBooking = () => {
    alert('예매 기능은 현재 준비 중입니다.');
  };

  if (loading) {
    return <div className="text-center p-12 text-2xl text-gray-800 dark:text-white">상세 정보 로딩 중...</div>;
  }

  if (!movie) {
    return <div className="text-center p-12 text-2xl text-gray-800 dark:text-white">영화 정보를 찾을 수 없습니다.</div>;
  }

  // 3. 받아온 데이터를 사용해 상세 페이지 UI를 그립니다.
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto text-gray-800 dark:text-white">
      <Link to="/" className="text-blue-500 hover:underline">&laquo; 뒤로가기</Link>
      <div className="flex flex-col md:flex-row mt-5">
        <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt={movie.title} className="w-full md:w-1/3 rounded-lg shadow-lg" />
        <div className="md:ml-8 mt-5 md:mt-0">
          <h1 className="text-3xl md:text-4xl font-bold">{movie.title}</h1>
          <p className="mt-2"><strong>평점:</strong> <span className="text-yellow-500">{movie.vote_average.toFixed(1)}</span></p>
          <p className="mt-2"><strong>개봉일:</strong> {movie.release_date}</p>
          <p className="mt-2"><strong>장르:</strong> {movie.genres.map(g => g.name).join(', ')}</p>
          
          {/* 예매하기 버튼 */}
          <button
            onClick={handleBooking}
            className="mt-6 w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition-colors text-lg"
          >
            예매하기
          </button>

          <h3 className="text-2xl font-bold mt-6">줄거리</h3>
          <p className="mt-2 text-gray-700 dark:text-gray-300">{movie.overview}</p>
        </div>
      </div>

      {/* 트레일러 영상이 있을 경우에만 보여줍니다. */}
      {trailerKey && (
        <div className="mt-12">
          <h2 className="text-3xl font-bold mb-4">공식 트레일러</h2>
          <div className="relative aspect-w-16 aspect-h-9">
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full rounded-lg shadow-lg"
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetailPage;