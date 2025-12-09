import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import MovieCard from '../components/MovieCard'; // 영화 카드 재활용

interface ActorDetails {
  id: number;
  name: string;
  profile_path: string | null;
  biography: string;
  birthday: string | null;
  place_of_birth: string | null;
  // 필요한 다른 정보 추가
}

interface MovieCredit {
  id: number;
  title: string;
  poster_path: string | null;
  character: string;
  release_date: string;
}

const ActorDetailPage: React.FC = () => {
  const { personId } = useParams<{ personId: string }>();
  const [actor, setActor] = useState<ActorDetails | null>(null);
  const [movieCredits, setMovieCredits] = useState<MovieCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const tmdbApiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb'; // TMDB API 키

  useEffect(() => {
    if (!personId) return;

    const fetchActorDetails = async () => {
      setLoading(true);
      try {
        // 배우 상세 정보 가져오기
        const actorRes = await axios.get<ActorDetails>(
          `https://api.themoviedb.org/3/person/${personId}?api_key=${tmdbApiKey}&language=ko-KR`
        );
        setActor(actorRes.data);

        // 배우의 출연 영화 목록 가져오기
        const creditsRes = await axios.get<{ cast: MovieCredit[] }>(
          `https://api.themoviedb.org/3/person/${personId}/movie_credits?api_key=${tmdbApiKey}&language=ko-KR`
        );
        // 개봉일 기준으로 최신순 정렬 (내림차순)
        const sortedCredits = creditsRes.data.cast.sort((a, b) => {
          if (!a.release_date) return 1;
          if (!b.release_date) return -1;
          return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
        });
        setMovieCredits(sortedCredits);

      } catch (error) {
        console.error("Failed to fetch actor details or movie credits:", error);
        setActor(null);
        setMovieCredits([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActorDetails();
  }, [personId]);

  if (loading) {
    return <div className="text-center p-12 text-2xl dark:text-white">배우 정보를 불러오는 중...</div>;
  }

  if (!actor) {
    return <div className="text-center p-12 text-2xl text-red-500">배우 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start mb-8">
          <img
            src={actor.profile_path ? `https://image.tmdb.org/t/p/w300${actor.profile_path}` : 'https://via.placeholder.com/300x450?text=No+Image'}
            alt={actor.name}
            className="w-48 h-auto rounded-lg shadow-md mb-4 md:mb-0 md:mr-8"
          />
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-bold mb-2">{actor.name}</h1>
            {actor.birthday && <p className="text-lg text-gray-600 dark:text-gray-300">생년월일: {actor.birthday}</p>}
            {actor.place_of_birth && <p className="text-lg text-gray-600 dark:text-gray-300">출생지: {actor.place_of_birth}</p>}
            <p className="mt-4 text-gray-700 dark:text-gray-200 leading-relaxed">
              {actor.biography || '제공되는 정보가 없습니다.'}
            </p>
          </div>

        </div>

        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-3xl font-bold mb-6">출연작 ({movieCredits.length})</h2>
          {movieCredits.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">출연작 정보가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
              {movieCredits.map((movie) => (
                <MovieCard
                  key={movie.id}
                  id={String(movie.id)} // MovieCard는 id를 string으로 받음
                  title={movie.title}
                  posterUrl={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image'}
                  size="sm"
                  showTitle={true}
                  // 배우 페이지에서는 찜하기/워치리스트 기능은 비활성화
                  isFavorite={false}
                  onToggleFavorite={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActorDetailPage;