package com.boot.dto;

import com.boot.entity.Booking;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Getter
@Setter
@Builder
public class BookingResponseDto {
    // 예매 기본 정보
    private Long bookingId;
    private String bookingStatus;
    private List<String> seats;
    private Integer seatCount;
    private Integer totalPrice;
    private LocalDateTime createdAt;

    // 사용자 정보
    private Long userId;
    private String userName;
    private String userEmail;

    // 시간표 정보
    private Long showtimeId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    // 영화 정보 (Elasticsearch에서 조회)
    private String movieId;
    private String movieTitle;
    private String posterPath;
    private Integer runtime;

    // 영화관 정보
    private Long theaterId;
    private String theaterName;
    private String theaterChain;
    private String theaterAddress;

    // 상영관 정보
    private Long screenId;
    private String screenName;
    private String screenType;

    public static BookingResponseDto fromEntity(Booking booking) {
        return BookingResponseDto.builder()
                .bookingId(booking.getId())
                .bookingStatus(booking.getBookingStatus())
                .seats(Arrays.asList(booking.getSeats().split(",")))
                .seatCount(booking.getSeatCount())
                .totalPrice(booking.getTotalPrice())
                .createdAt(booking.getCreatedAt())
                .userId(booking.getUser().getId())
                .userName(booking.getUser().getName())
                .userEmail(booking.getUser().getEmail())
                .showtimeId(booking.getShowtime().getId())
                .movieId(booking.getShowtime().getMovieId())
                .startTime(booking.getShowtime().getStartTime())
                .endTime(booking.getShowtime().getEndTime())
                .theaterId(booking.getShowtime().getScreen().getTheater().getId())
                .theaterName(booking.getShowtime().getScreen().getTheater().getName())
                .theaterChain(booking.getShowtime().getScreen().getTheater().getChain())
                .theaterAddress(booking.getShowtime().getScreen().getTheater().getAddress())
                .screenId(booking.getShowtime().getScreen().getId())
                .screenName(booking.getShowtime().getScreen().getName())
                .screenType(booking.getShowtime().getScreen().getScreenType())
                .build();
    }
}
