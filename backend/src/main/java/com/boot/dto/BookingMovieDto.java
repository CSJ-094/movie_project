package com.boot.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * 예매 페이지용 영화 정보 DTO
 * - 실제 상영 중인 영화 정보
 * - Elasticsearch 영화 데이터 + MySQL 상영 정보 결합
 */
@Getter
@Setter
@Builder
public class BookingMovieDto {
    // Elasticsearch 영화 정보
    private Long movieId;          // TMDB ID (숫자만)
    private String title;
    private String posterUrl;
    private Double voteAverage;
    private String releaseDate;
    private String overview;

    // 상영 정보 (MySQL showtime 기반)
    private LocalDate firstShowDate;    // 최초 상영일
    private LocalDate lastShowDate;     // 마지막 상영일
    private Integer totalShowtimes;     // 총 상영 횟수
    private Boolean isNowPlaying;       // 현재 상영 중 여부

    // 상영관별 시간표 <theaterId, List<ShowtimeInfoDto>>
    private java.util.Map<Long, java.util.List<ShowtimeInfoDto>> theaterShowtimes;
}
