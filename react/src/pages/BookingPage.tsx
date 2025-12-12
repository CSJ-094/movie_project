import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ko } from 'date-fns/locale';

// ...existing code...
interface Movie {
  movieId: number;
  title: string;
  posterUrl: string;
  voteAverage: number;
  releaseDate: string;
  overview: string;
  // 상영 정보 추가
  firstShowDate?: string;
  lastShowDate?: string;
  totalShowtimes?: number;
  isNowPlaying?: boolean;
}
interface Theater {
  id: number;
  name: string;
  chain: string;
  region: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
}
interface RegionGroup {
  name: string;
  theaters: Theater[];
}
interface Showtime {
  id: number;
  movieId: string;
  screenId: number;
  startTime: string;
  endTime: string;
  price: number;
  availableSeats: number;
  totalSeats: number;
  movieTitle: string;
  posterPath: string;
  runtime: number;
  voteAverage: number;
  theaterName: string;
  screenName: string;
  screenType: string;
}

export default function BookingPage() {
      // 고정적으로 보여줄 영화 id (최신 목록)
      const fixedOtherMovieIds = [1379266, 1084242, 1228246, 1242898, 1555417, 701387];
    // 영화사별 드롭다운 상태 관리
    const [openChains, setOpenChains] = useState<{[chain: string]: boolean}>({});
    const toggleChain = (chain: string) => {
      setOpenChains(prev => ({ ...prev, [chain]: !prev[chain] }));
    };
  const location = useLocation();
  const navigate = useNavigate();
  // nowPlayingMovies도 함께 받을 수 있도록 타입 확장
  const movieFromDetail = location.state as { movieId?: number; title?: string; posterUrl?: string; voteAverage?: number; releaseDate?: string; nowPlayingMovies?: Movie[] } | null;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedTheater, setSelectedTheater] = useState<Theater | null>(null);
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [regionGroups, setRegionGroups] = useState<RegionGroup[]>([]); // [{name: 지역, theaters: []}]
  const [selectedRegionIdx, setSelectedRegionIdx] = useState(0); // 좌측 지역 인덱스
  // 특별관 탭 제거: theaterTab 관련 코드 삭제
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateScrollOffset, setDateScrollOffset] = useState(0);

  // 날짜 배열 생성 (오늘부터 30일)
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const allDates = generateDates();
  const visibleDates = allDates.slice(dateScrollOffset, dateScrollOffset + 14);

  // 날짜 포맷 함수
  const getDayOfWeek = (date: Date) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[date.getDay()];
  };

  const getDateLabel = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return '오늘';
    if (date.toDateString() === tomorrow.toDateString()) return '내일';
    return getDayOfWeek(date);
  };

  // 시간대 타입 계산
  const getTimeType = (date: Date) => {
    const hour = date.getHours();
    if (hour < 10) return '조조';
    if (hour >= 23) return '심야';
    return '일반';
  };

  // 날짜 이동 핸들러
  const handlePrevDates = () => {
    if (dateScrollOffset > 0) {
      setDateScrollOffset(dateScrollOffset - 7);
    }
  };

  const handleNextDates = () => {
    if (dateScrollOffset + 14 < allDates.length) {
      setDateScrollOffset(dateScrollOffset + 7);
    }
  };

  // 캘린더 아이콘 클릭 핸들러
  const handleCalendarClick = () => {
    setShowCalendar(!showCalendar);
  };

  // 캘린더에서 날짜 선택 시 처리
  const handleDatePickerChange = async (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
      setShowCalendar(false);
      // 선택한 날짜가 표시되도록 스크롤 위치 조정
      const daysDiff = Math.floor((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff < 30) {
        // 선택한 날짜가 화면 중앙에 오도록 스크롤 위치 계산
        const newOffset = Math.max(0, Math.min(daysDiff - 7, allDates.length - 14));
        setDateScrollOffset(newOffset);
      }
    }
};

  useEffect(() => {
    // location.state에 nowPlayingMovies가 있으면 우선 사용
    if (movieFromDetail && Array.isArray(movieFromDetail.nowPlayingMovies) && movieFromDetail.nowPlayingMovies.length > 0) {
      setMovies(movieFromDetail.nowPlayingMovies);
      // 선택 영화도 맞춰서 세팅
      if (movieFromDetail.movieId) {
        const matchedMovie = movieFromDetail.nowPlayingMovies.find((m) => m.movieId === movieFromDetail.movieId);
        if (matchedMovie) {
          setSelectedMovie(matchedMovie);
        } else {
          // 목록에 없는 경우(상영 중이 아님) 맨 앞에 추가
          const newMovie: Movie = {
            movieId: movieFromDetail.movieId,
            title: movieFromDetail.title || '',
            posterUrl: movieFromDetail.posterUrl || '',
            voteAverage: movieFromDetail.voteAverage || 0,
            releaseDate: movieFromDetail.releaseDate || '',
            overview: '',
            isNowPlaying: true
          };
          setMovies([newMovie, ...movieFromDetail.nowPlayingMovies]);
          setSelectedMovie(newMovie);
        }
      }
      return;
    }
    // 기존 fetchMovies 로직 (백엔드에서 가져오기)
    const fetchMovies = async () => {
      try {
        const response = await axios.get('http://localhost:8484/api/bookings/movies', {
          params: { region: '부산' }
        });
        let movieList = response.data;
        if (!Array.isArray(movieList) && Array.isArray(response.data.movies)) {
          movieList = response.data.movies;
        }
        if (!Array.isArray(movieList)) {
          movieList = [];
        }
        movieList = movieList.map((m: any) => ({
          ...m,
          isNowPlaying: m.is_now_playing ?? m.isNowPlaying
        }));
        if (movieFromDetail && movieFromDetail.movieId) {
          const matchedMovie = movieList.find(
            (m: Movie) => m.movieId === movieFromDetail.movieId
          );
          if (matchedMovie) {
            setSelectedMovie(matchedMovie);
          } else {
            const newMovie: Movie = {
              movieId: movieFromDetail.movieId,
              title: movieFromDetail.title || '',
              posterUrl: movieFromDetail.posterUrl || '',
              voteAverage: movieFromDetail.voteAverage || 0,
              releaseDate: movieFromDetail.releaseDate || '',
              overview: '',
              isNowPlaying: true
            };
            movieList = [newMovie, ...movieList];
            setSelectedMovie(newMovie);
          }
        }
        setMovies(movieList.slice(0, 10));
      } catch (error) {
        console.error('영화 목록 가져오기 실패:', error);
      }
    };
    fetchMovies();
  }, [movieFromDetail]);

  // 부산 극장 데이터 가져오기
  useEffect(() => {
    // 전국 극장 데이터 불러와서 지역별 그룹핑
    const fetchTheaters = async () => {
      try {
        const response = await axios.get('http://localhost:8484/api/theaters');
        const theaterList: Theater[] = Array.isArray(response.data) ? response.data : (response.data?.theaters || []);
        // 지역별 그룹핑
        const groupedByRegion = theaterList.reduce((acc, theater) => {
          const region = theater.region;
          if (!acc[region]) acc[region] = [];
          acc[region].push(theater);
          return acc;
        }, {} as Record<string, Theater[]>);
        const regionGroups: RegionGroup[] = Object.keys(groupedByRegion).map(region => ({
          name: region,
          theaters: groupedByRegion[region]
        }));
        setRegionGroups(regionGroups);
      } catch (error) {
        setRegionGroups([]);
      }
    };
    fetchTheaters();
  }, []);

  // 상영시간표 가져오기 (영화, 극장, 날짜 선택 시)
  useEffect(() => {
    const fetchShowtimes = async () => {
      if (!selectedMovie || !selectedTheater) {
        setShowtimes([]);
        return;
      }

      setLoadingShowtimes(true);
      try {
        // 로컬 시간대 기준으로 날짜 포맷팅 (YYYY-MM-DD)
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;

        const response = await axios.get('http://localhost:8484/api/showtimes', {
          params: {
            movieId: selectedMovie.movieId, // tmdb_ 접두사 제거
            theaterId: selectedTheater.id,
            date: formattedDate
          },
          timeout: 5000 // 5초 타임아웃 설정
        });
        
        setShowtimes(response.data);
      } catch (error) {
        console.error('상영시간표 가져오기 실패:', error);
        setShowtimes([]);
      } finally {
        setLoadingShowtimes(false);
      }
    };

    // 약간의 지연(debounce) 추가하여 빠른 선택 변경 시 불필요한 요청 방지
    const timeoutId = setTimeout(() => {
      fetchShowtimes();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [selectedMovie, selectedTheater, selectedDate]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">빠른예매</h1>
        </div>
      </div>

      {/* 날짜 선택 */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex items-center justify-between py-2">
            <button 
              onClick={handlePrevDates}
              disabled={dateScrollOffset === 0}
              className={`p-2 rounded ${dateScrollOffset === 0 ? 'text-gray-300 dark:text-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex gap-1 overflow-x-auto">
              {visibleDates.map((date, index) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const dayOfWeek = getDayOfWeek(date);
                const dateLabel = getDateLabel(date);
                
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`flex flex-col items-center min-w-[70px] px-4 py-2 rounded transition-colors ${
                      isSelected
                        ? 'bg-red-600 text-white'
                        : dayOfWeek === '토'
                        ? 'text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        : dayOfWeek === '일'
                        ? 'text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-sm font-medium">{dateLabel}</span>
                    <span className="text-lg font-bold">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>
            <button 
              onClick={handleNextDates}
              disabled={dateScrollOffset + 14 >= allDates.length}
              className={`p-2 rounded ${dateScrollOffset + 14 >= allDates.length ? 'text-gray-300 dark:text-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="relative ml-4">
              <button 
                onClick={handleCalendarClick}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </button>
              {showCalendar && (
                <div className="absolute right-0 mt-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700">
                  <DatePicker
                    selected={selectedDate}
                    onChange={handleDatePickerChange}
                    inline
                    locale={ko}
                    minDate={new Date()}
                    maxDate={new Date(new Date().setDate(new Date().getDate() + 29))}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 - 4단 레이아웃 */}
      <div className="max-w-[1600px] mx-auto flex border-t dark:border-gray-700">
        {/* 왼쪽: 영화 포스터 + 영화 리스트 */}
        <div className="w-[280px] min-w-[200px] flex flex-col border-r dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
              <div className="py-3 px-4 text-center font-bold text-lg text-gray-900 dark:text-white">
                선택하신 영화
              </div>
            </div>
            <div className="p-4">
              {selectedMovie ? (
                <div>
                  <img 
                    src={selectedMovie.posterUrl} 
                    alt={selectedMovie.title}
                    className="w-48 h-72 object-cover rounded-lg shadow-lg mx-auto"
                  />
                  <h3 className="mt-4 font-bold text-gray-900 dark:text-white text-lg text-center">{selectedMovie.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">⭐ {selectedMovie.voteAverage}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 text-center">{selectedMovie.releaseDate}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 mt-20">
                  <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                  <p className="text-xs text-center">영화를<br/>선택해주세요</p>
                </div>
              )}
            </div>
          </div>

          {/* 영화 선택 */}
          <div className="flex-1 overflow-y-auto" style={{ maxWidth: '320px' }}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
              <div className="py-3 px-4 text-center font-bold text-lg text-gray-900 dark:text-white">
                그 외 상영중인 영화들
              </div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              {[selectedMovie, ...movies.filter(movie => fixedOtherMovieIds.includes(movie.movieId) && movie.movieId !== selectedMovie?.movieId)]
                .filter((movie, idx, arr) => movie && arr.findIndex(m => m?.movieId === movie?.movieId) === idx)
                .map((movie) => (
                  movie && (
                    <button
                      key={movie.movieId}
                      onClick={() => setSelectedMovie(selectedMovie?.movieId === movie.movieId ? null : movie)}
                      className={`w-full px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 border-b dark:border-gray-700 ${
                        selectedMovie?.movieId === movie.movieId ? 'bg-red-50 dark:bg-red-900/20' : ''
                      }`}
                    >
                      {/* 포스터 이미지 */}
                      <img 
                        src={movie.posterUrl} 
                        alt={movie.title}
                        className="w-16 h-24 object-cover rounded shadow-sm flex-shrink-0"
                      />
                      {/* 영화 정보 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-gray-900 dark:text-gray-200 font-medium truncate">{movie.title}</p>
                        {movie.isNowPlaying && movie.firstShowDate && movie.lastShowDate && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(movie.firstShowDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} ~ {new Date(movie.lastShowDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                        {!movie.isNowPlaying && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">상영 종료</p>
                        )}
                      </div>
                      {/* 좋아요 아이콘 */}
                      <div className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 cursor-pointer flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                    </button>
                  )
                ))}
            </div>
          </div>

        {/* 오른쪽: 극장 선택 + 상영시간표 */}
        <div className="flex-1 flex min-h-[600px] bg-white dark:bg-gray-800">
          {/* 극장 선택 */}
          <div className="w-[40%] border-r dark:border-gray-700 flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
              <div className="py-3 px-4 text-center font-medium text-gray-900 dark:text-white">극장</div>
              {/* 탭 */}
              {/* 특별관 탭 완전 제거 */}
            </div>
            <div className="flex h-full" style={{minHeight:'500px'}}>
              {/* 좌측: 지역 리스트 */}
              <div className="w-[45%] border-r dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-900" style={{maxHeight:'calc(100vh - 250px)'}}>
                {regionGroups.map((region, idx) => (
                  <button
                    key={region.name}
                    onClick={()=>setSelectedRegionIdx(idx)}
                    className={`w-full px-4 py-3 text-left text-sm border-b border-gray-200 dark:border-gray-700 transition-all
                      ${selectedRegionIdx===idx
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold border-r-2 border-r-gray-900 dark:border-r-white'
                        : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}
                      `}
                  >
                    {region.name} <span className="text-xs text-gray-400">({region.theaters.length})</span>
                  </button>
                ))}
              </div>
              {/* 우측: 해당 지역의 극장 리스트 (영화사별 그룹핑) */}
              <div className="w-[55%] overflow-y-auto bg-white dark:bg-gray-800" style={{maxHeight:'calc(100vh - 250px)'}}>
                {(() => {
                  // 특별관 필터 완전 제거: 항상 전체 극장만 노출
                  const theaters = (regionGroups[selectedRegionIdx]?.theaters||[]);
                  // 영화사별 그룹핑
                  const chains = Array.from(new Set(theaters.map(t=>t.chain)));
                  return chains.map(chain => (
                    <div key={chain} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <button
                        className="relative flex items-center w-full px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all justify-between group overflow-hidden"
                        onClick={() => toggleChain(chain)}
                      >
                        <div className="relative z-10 flex items-center gap-2">
                           <span className="font-bold text-sm text-gray-900 dark:text-white">{chain}</span>
                        </div>
                        <span className={`relative z-10 text-gray-400 transition-transform duration-200 ${openChains[chain] ? 'rotate-180' : ''}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </button>
                      {openChains[chain] && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 py-1">
                          {theaters.filter(t=>t.chain===chain).map(theater=>(
                            <button
                              key={theater.id}
                              onClick={()=>setSelectedTheater(theater)}
                              className={`w-full px-8 py-2 text-left text-sm transition-all flex items-center gap-2
                                ${selectedTheater?.id===theater.id
                                  ? 'text-gray-900 dark:text-white font-bold bg-gray-200 dark:bg-gray-700'
                                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}
                              `}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${selectedTheater?.id===theater.id ? 'bg-red-600' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
                              {theater.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* 시간 선택 (상영시간표) */}
          <div className="w-[60%] bg-gray-50 dark:bg-gray-900 flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
              <div className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 dark:text-white">시간</h3>
                  <div className="flex gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 bg-yellow-400 rounded-sm"></span>
                      <span className="text-gray-600 dark:text-gray-400">조조</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 bg-purple-400 rounded-sm"></span>
                      <span className="text-gray-600 dark:text-gray-400">일반</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 bg-blue-400 rounded-sm"></span>
                      <span className="text-gray-600 dark:text-gray-400">심야</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto p-8" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              {selectedMovie ? (
                !selectedTheater ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
                    <p className="text-sm">극장을 선택해주세요.</p>
                  </div>
                ) : loadingShowtimes ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
                    <p className="text-sm font-medium">상영시간표 조회 중...</p>
                    <p className="text-xs mt-1">잠시만 기다려주세요</p>
                  </div>
                ) : showtimes.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium mb-1">죄송합니다</p>
                    <p className="text-sm">선택하신 날짜에 상영 일정이 없습니다.</p>
                    <p className="text-xs mt-2 text-gray-400 dark:text-gray-500">다른 날짜를 선택해주세요.</p>
                  </div>
                ) : (
                  <div className="space-y-6 p-2">
                    {showtimes.map((showtime, index) => {
                      const startTime = new Date(showtime.startTime);
                      const isSelected = selectedShowtime?.id === showtime.id;
                      const timeType = getTimeType(startTime);
                      
                      return (
                        <button
                          key={`${showtime.id}-${index}`}
                          onClick={() => setSelectedShowtime(showtime)}
                          className={`w-full p-4 rounded-lg text-left transition-all duration-300 ${
                            isSelected 
                              ? 'border-[3px] border-red-600 bg-white dark:bg-gray-700 shadow-2xl dark:shadow-[0_0_15px_rgba(220,38,38,0.5)]' 
                              : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg text-gray-900 dark:text-white">
                                {startTime.getHours().toString().padStart(2, '0')}:{startTime.getMinutes().toString().padStart(2, '0')}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                ~ {new Date(showtime.endTime).getHours().toString().padStart(2, '0')}:{new Date(showtime.endTime).getMinutes().toString().padStart(2, '0')}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                timeType === '조조' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                                timeType === '심야' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' :
                                'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400'
                              }`}>
                                {timeType}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">{showtime.screenName}</span>
                              <span className="text-gray-500 dark:text-gray-500 mx-2">|</span>
                              <span className="text-gray-600 dark:text-gray-400">{showtime.screenType}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-gray-600 dark:text-gray-400">
                                잔여 {showtime.availableSeats}/{showtime.totalSeats}석
                              </div>
                              <div className="text-red-600 dark:text-red-400 font-bold">
                                {showtime.price.toLocaleString()}원
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <svg className="w-24 h-24 mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                  <p className="text-sm font-medium mb-1">영화를 선택하시면</p>
                  <p className="text-sm">상영시간표를 비교하여 볼 수 있습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 하단 고정 예매 버튼 */}
      {selectedShowtime && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg z-50">
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">영화</p>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedMovie?.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">극장</p>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedTheater?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">상영시간</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {new Date(selectedShowtime.startTime).toLocaleString('ko-KR', { 
                      month: 'long', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">상영관</p>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedShowtime.screenName}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  // 좌석 선택 페이지로 이동
                  navigate('/seat-selection', {
                    state: {
                      movieTitle: selectedMovie?.title,
                      theaterName: selectedTheater?.name,
                      screenName: selectedShowtime.screenName,
                      startTime: selectedShowtime.startTime,
                      price: selectedShowtime.price,
                      availableSeats: selectedShowtime.availableSeats,
                      showtimeId: selectedShowtime.id,
                      screenId: selectedShowtime.screenId,
                      screenType: selectedShowtime.screenType,
                    },
                  });
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-12 rounded-lg text-lg transition-colors shadow-lg"
              >
                좌석지정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
