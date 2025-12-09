package com.boot.dto;

import com.boot.entity.Showtime;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ShowtimeResponseDto {
    // 시간표 기본 정보
    private Long id; // 프론트엔드 호환성을 위한 필드
    private Long showtimeId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer price;
    private Integer availableSeats;
    private Integer totalSeats;

    // 영화 정보 (Elasticsearch에서 조회)
    private String movieId;
    private String movieTitle;
    private String posterPath;
    private Integer runtime;
    private Double voteAverage;

    // 영화관 정보
    private Long theaterId;
    private String theaterName;
    private String theaterChain;
    private String theaterRegion;
    private String theaterAddress;

    // 상영관 정보
    private Long screenId;
    private String screenName;
    private String screenType;

    public static ShowtimeResponseDto fromEntity(Showtime showtime) {
        return ShowtimeResponseDto.builder()
                .id(showtime.getId()) // 프론트엔드 호환성을 위해 추가
                .showtimeId(showtime.getId())
                .movieId(showtime.getMovieId())
                .startTime(showtime.getStartTime())
                .endTime(showtime.getEndTime())
                .price(showtime.getPrice())
                .availableSeats(showtime.getAvailableSeats())
                .totalSeats(showtime.getScreen().getTotalSeats())
                .theaterId(showtime.getScreen().getTheater().getId())
                .theaterName(showtime.getScreen().getTheater().getName())
                .theaterChain(showtime.getScreen().getTheater().getChain())
                .theaterRegion(showtime.getScreen().getTheater().getRegion())
                .theaterAddress(showtime.getScreen().getTheater().getAddress())
                .screenId(showtime.getScreen().getId())
                .screenName(showtime.getScreen().getName())
                .screenType(showtime.getScreen().getScreenType())
                .build();
    }
}
