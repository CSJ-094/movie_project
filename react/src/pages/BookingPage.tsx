import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ko } from 'date-fns/locale';

interface Movie {
  movieId: number;
  title: string;
  posterUrl: string;
  voteAverage: number;
  releaseDate: string;
  overview: string;
}

export default function BookingPage() {
  const location = useLocation();
  const movieFromDetail = location.state as { movieId?: number; title?: string; posterUrl?: string; voteAverage?: number; releaseDate?: string } | null;
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedTheater, setSelectedTheater] = useState<string | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateScrollOffset, setDateScrollOffset] = useState(0);
  const datePickerRef = useRef<DatePicker>(null);

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
  const handleDatePickerChange = (date: Date | null) => {
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

  // API에서 현재 상영중인 영화 10개 가져오기
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await axios.get('http://localhost:8484/api/movies/search', {
          params: {
            nowPlaying: true,
            page: 0,
            size: 10
          }
        });
        
        let movieList = response.data.movies;
        
        // MovieDetailPage에서 전달받은 영화 정보가 있으면 처리
        if (movieFromDetail && movieFromDetail.movieId) {
          const matchedMovie = movieList.find(
            (m: Movie) => m.movieId === movieFromDetail.movieId
          );
          
          if (matchedMovie) {
            // 목록에 이미 있는 경우 해당 영화 선택
            setSelectedMovie(matchedMovie);
          } else {
            // 목록에 없는 경우 맨 앞에 추가
            const newMovie: Movie = {
              movieId: movieFromDetail.movieId,
              title: movieFromDetail.title || '',
              posterUrl: movieFromDetail.posterUrl || '',
              voteAverage: movieFromDetail.voteAverage || 0,
              releaseDate: movieFromDetail.releaseDate || '',
              overview: ''
            };
            movieList = [newMovie, ...movieList];
            setSelectedMovie(newMovie);
          }
        }
        
        setMovies(movieList);
        setLoading(false);
      } catch (error) {
        console.error('영화 목록 가져오기 실패:', error);
        setLoading(false);
      }
    };

    fetchMovies();
  }, [movieFromDetail]);

  // 극장 데이터
  const regions = [
    { name: '서울', count: 20 },
    { name: '경기', count: 32 },
    { name: '인천', count: 7 },
    { name: '대전/충청/세종', count: 18 },
    { name: '부산/대구/경상', count: 27 },
    { name: '광주/전라', count: 9 },
    { name: '강원', count: 4 },
    { name: '제주', count: 3 },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">빠른예매</h1>
        </div>
      </div>

      {/* 날짜 선택 */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-[1400px] mx-auto px-6">
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
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-12 border-t dark:border-gray-700">
          {/* 선택한 영화 포스터 영역 */}
          <div className="col-span-2 border-r dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
              <div className="py-3 px-4 text-center font-medium text-gray-900 dark:text-white">
                선택 영화
              </div>
            </div>
            <div className="p-4">
              {selectedMovie ? (
                <div>
                  <img 
                    src={selectedMovie.posterUrl} 
                    alt={selectedMovie.title}
                    className="w-full rounded-lg shadow-lg"
                  />
                  <h3 className="mt-4 font-bold text-gray-900 dark:text-white text-sm text-center">{selectedMovie.title}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">⭐ {selectedMovie.voteAverage}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 text-center">{selectedMovie.releaseDate}</p>
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
          <div className="col-span-3 border-r dark:border-gray-700 min-h-[600px] bg-white dark:bg-gray-800">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
              <div className="py-3 px-4 text-center font-medium text-gray-900 dark:text-white">
                영화
              </div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              {movies.map((movie) => (
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
                    className="w-12 h-16 object-cover rounded shadow-sm flex-shrink-0"
                  />
                  {/* 영화 제목 */}
                  <span className="text-sm text-gray-900 dark:text-gray-200 flex-1">{movie.title}</span>
                  {/* 좋아요 아이콘 */}
                  <div className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 cursor-pointer flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 극장 선택 */}
          <div className="col-span-2 border-r dark:border-gray-700 min-h-[600px] bg-white dark:bg-gray-800">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
              <div className="py-3 px-4 text-center font-medium text-gray-900 dark:text-white">
                극장
              </div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              {regions.map((region) => (
                <button
                  key={region.name}
                  onClick={() => setSelectedTheater(region.name)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 ${
                    selectedTheater === region.name ? 'bg-red-50 dark:bg-red-900/20' : ''
                  }`}
                >
                  <span className="text-sm text-gray-900 dark:text-gray-200">{region.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500 ml-1">({region.count})</span>
                </button>
              ))}
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                <p className="font-medium mb-2">전체극장</p>
                <p>목록에서 극장을 선택하세요.</p>
              </div>
            </div>
          </div>

          {/* 시간 선택 */}
          <div className="col-span-5 min-h-[600px] bg-gray-50 dark:bg-gray-900">
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
                      <span className="text-gray-600 dark:text-gray-400">본관심</span>
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
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
                    <p className="text-sm">선택하신 영화와 극장의</p>
                    <p className="text-sm">상영 시간표가 여기에 표시됩니다.</p>
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
    </div>
  );
}
