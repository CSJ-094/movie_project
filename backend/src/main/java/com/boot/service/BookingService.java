package com.boot.service;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.GetResponse;
import com.boot.dto.BookingMovieDto;
import com.boot.dto.BookingRequestDto;
import com.boot.dto.BookingResponseDto;
import com.boot.elastic.Movie;
import com.boot.entity.Booking;
import com.boot.entity.Showtime;
import com.boot.entity.User;
import com.boot.repository.BookingRepository;
import com.boot.repository.ShowtimeRepository;
import com.boot.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ShowtimeRepository showtimeRepository;
    private final UserRepository userRepository;
    private final ElasticsearchClient elasticsearchClient;
    private final com.boot.repository.PaymentRepository paymentRepository;
    private final com.boot.service.PaymentService paymentService;

    /**
     * 예매 페이지용 영화 목록 조회 (지역별 실제 상영 중인 영화)
     */
    public List<BookingMovieDto> getBookingMovies(String region) {
        // 1. 해당 지역에서 오늘 이후 상영하는 모든 showtime 조회
        List<Showtime> showtimes = showtimeRepository.findByRegionAndStartTimeAfter(region, LocalDateTime.now());

        // 2. 영화별로 그룹핑 (movieId를 키로)
        Map<String, List<Showtime>> movieShowtimes = showtimes.stream()
            .collect(Collectors.groupingBy(Showtime::getMovieId, LinkedHashMap::new, Collectors.toList()));

        // 3. movieId 목록 추출 및 Elasticsearch 배치 조회
        List<String> movieIds = new ArrayList<>(movieShowtimes.keySet());
        List<String> elasticIds = movieIds.stream()
            .map(id -> id.replace("tmdb_", ""))
            .collect(Collectors.toList());

        // Elasticsearch에서 여러 영화 정보 한 번에 조회
        Map<String, Movie> movieMap = new LinkedHashMap<>();
        try {
            var searchResponse = elasticsearchClient.search(
                s -> s.index("movies")
                    .query(q -> q.ids(i -> i.values(elasticIds)))
                    .size(elasticIds.size()),
                Movie.class
            );
            searchResponse.hits().hits().forEach(hit -> {
            if (hit.id() != null && hit.source() != null) {
                movieMap.put("tmdb_" + hit.id(), hit.source());
            }
            });
        } catch (Exception e) {
            System.err.println("Elasticsearch batch fetch failed: " + e.getMessage());
        }

        // 4. 각 영화에 대해 BookingMovieDto 생성
        List<BookingMovieDto> bookingMovies = new ArrayList<>();
        for (Map.Entry<String, List<Showtime>> entry : movieShowtimes.entrySet()) {
            String movieId = entry.getKey();
            List<Showtime> movieShowtimeList = entry.getValue();

            // 최초/최종 상영일 계산
            LocalDate firstShowDate = movieShowtimeList.stream()
                .map(s -> s.getStartTime().toLocalDate())
                .min(LocalDate::compareTo)
                .orElse(LocalDate.now());

            LocalDate lastShowDate = movieShowtimeList.stream()
                .map(s -> s.getStartTime().toLocalDate())
                .max(LocalDate::compareTo)
                .orElse(LocalDate.now());

            // 상영관별로 그룹핑 (theaterId 기준)
            Map<Long, List<com.boot.dto.ShowtimeInfoDto>> theaterShowtimes = movieShowtimeList.stream()
                .collect(Collectors.groupingBy(
                    s -> s.getScreen().getTheater().getId(),
                    LinkedHashMap::new,
                    Collectors.mapping(s -> com.boot.dto.ShowtimeInfoDto.builder()
                        .showtimeId(s.getId())
                        .theaterName(s.getScreen().getTheater().getName())
                        .screenName(s.getScreen().getName())
                        .startTime(s.getStartTime())
                        .endTime(s.getEndTime())
                        .build(),
                        Collectors.toList())
                ));

            Movie movie = movieMap.get(movieId);
            if (movie != null) {
                Long movieIdLong = null;
                try {
                    movieIdLong = Long.parseLong(movie.getId());
                } catch (NumberFormatException e) {
                    // id가 숫자가 아니면 null로 처리
                }
                BookingMovieDto dto = BookingMovieDto.builder()
                        .movieId(movieIdLong)
                        .title(movie.getTitle())
                        .posterUrl(movie.getPosterPath() != null ?
                                "https://image.tmdb.org/t/p/w500" + movie.getPosterPath() : null)
                        .voteAverage(movie.getVoteAverage() != null ? movie.getVoteAverage().doubleValue() : 0.0)
                        .releaseDate(movie.getReleaseDate())
                        .overview(movie.getOverview())
                        .firstShowDate(firstShowDate)
                        .lastShowDate(lastShowDate)
                        .totalShowtimes(movieShowtimeList.size())
                        .isNowPlaying(true)
                        .theaterShowtimes(theaterShowtimes)
                        .build();
                bookingMovies.add(dto);
            }
        }
        return bookingMovies;
    }

    /**
     * 예매 생성
     */
    @Transactional
    public BookingResponseDto createBooking(BookingRequestDto request) {
        // 사용자 조회
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        // 시간표 조회
        Showtime showtime = showtimeRepository.findById(request.getShowtimeId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 시간표입니다."));

        // 좌석 수 체크
        int seatCount = request.getSeats().size();
        if (showtime.getAvailableSeats() < seatCount) {
            throw new IllegalStateException("잔여 좌석이 부족합니다.");
        }

        // 이미 예매된 좌석과 중복 체크
        List<String> bookedSeatsRaw = bookingRepository.findBookedSeatsByShowtimeId(showtime.getId());
        // "A1,A2,A3" -> [A1, A2, A3, ...]로 평탄화
        java.util.Set<String> bookedSeats = bookedSeatsRaw.stream()
                .flatMap(seats -> java.util.Arrays.stream(seats.split(",")))
                .collect(java.util.stream.Collectors.toSet());
        // 새로 예매하려는 좌석과 중복 체크
        for (String seat : request.getSeats()) {
            if (bookedSeats.contains(seat)) {
                throw new IllegalStateException("이미 예매된 좌석이 포함되어 있습니다: " + seat);
            }
        }

        // 좌석 문자열 생성 ("A1,A2,A3")
        String seatsStr = String.join(",", request.getSeats());

        // 예매 엔티티 생성
        Booking booking = Booking.builder()
                .user(user)
                .showtime(showtime)
                .seats(seatsStr)
                .seatCount(seatCount)
                .totalPrice(request.getTotalPrice())
                .bookingStatus("CONFIRMED")
                .build();

        // 좌석 차감
        showtime.decreaseAvailableSeats(seatCount);

        // 저장
        Booking savedBooking = bookingRepository.save(booking);
        showtimeRepository.save(showtime);

        // DTO 변환 및 영화 정보 추가
        BookingResponseDto dto = BookingResponseDto.fromEntity(savedBooking);
        enrichWithMovieData(dto);
        return dto;
    }

    /**
     * 사용자별 예매 내역 조회
     */
    public List<BookingResponseDto> getUserBookings(Long userId) {
        List<Booking> bookings = bookingRepository.findByUserIdOrderByCreatedAtDesc(userId);

        return bookings.stream()
                .map(booking -> {
                    BookingResponseDto dto = BookingResponseDto.fromEntity(booking);
                    enrichWithMovieData(dto);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * 예매 상세 조회
     */
    public BookingResponseDto getBookingDetail(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 예매입니다."));

        BookingResponseDto dto = BookingResponseDto.fromEntity(booking);
        enrichWithMovieData(dto);
        return dto;
    }

    /**
     * 예매 취소
     */
    @Transactional
    public void cancelBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 예매입니다."));

        if (!"CONFIRMED".equals(booking.getBookingStatus())) {
            throw new IllegalStateException("취소할 수 없는 예매입니다.");
        }

        // 1. 결제 정보 조회 (예매에 연결된 결제)
        var payments = paymentRepository.findByBookingId(bookingId);
        if (payments != null && !payments.isEmpty()) {
            var payment = payments.get(0); // 하나의 예매에 결제 1건 가정
            if (payment.getStatus() != com.boot.entity.Payment.PaymentStatus.CANCELED) {
                // 결제 취소 요청
                com.boot.dto.PaymentCancelRequest cancelRequest = new com.boot.dto.PaymentCancelRequest(
                        payment.getPaymentKey(), "예매 취소로 인한 결제 취소");
                var result = paymentService.cancelPayment(cancelRequest);
                if (!(Boolean.TRUE.equals(result.get("success")))) {
                    throw new RuntimeException("결제 취소에 실패했습니다.");
                }
            }
        }

        // 2. 예매 취소
        booking.cancel();

        // 3. 좌석 복구
        Showtime showtime = booking.getShowtime();
        showtime.increaseAvailableSeats(booking.getSeatCount());

        bookingRepository.save(booking);
        showtimeRepository.save(showtime);
    }

    /**
     * 특정 시간표의 예약된 좌석 목록 조회
     */
    public List<String> getBookedSeats(Long showtimeId) {
        List<String> seatStrings = bookingRepository.findBookedSeatsByShowtimeId(showtimeId);

        // "A1,A2,A3" 형식을 개별 좌석으로 분리
        return seatStrings.stream()
                .flatMap(seats -> List.of(seats.split(",")).stream())
                .collect(Collectors.toList());
    }

    /**
     * Elasticsearch에서 영화 정보 조회 후 DTO에 추가
     */
    private void enrichWithMovieData(BookingResponseDto dto) {
        try {
            // movieId에서 "tmdb_" 접두사 제거
            String elasticId = dto.getMovieId().replace("tmdb_", "");

            GetResponse<Movie> response = elasticsearchClient.get(
                    g -> g.index("movies").id(elasticId),
                    Movie.class
            );

            if (response.found() && response.source() != null) {
                Movie movie = response.source();
                dto.setMovieTitle(movie.getTitle());
                dto.setPosterPath(movie.getPosterPath());
                dto.setRuntime(movie.getRuntime() != null ? movie.getRuntime() : 120);
            }
        } catch (Exception e) {
            // Elasticsearch 조회 실패 시 기본값 유지
            dto.setMovieTitle("Unknown");
            dto.setRuntime(120);
        }
    }
}
