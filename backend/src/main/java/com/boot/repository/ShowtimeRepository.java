package com.boot.repository;

import com.boot.entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ShowtimeRepository extends JpaRepository<Showtime, Long> {
    // 영화별 시간표 조회
    List<Showtime> findByMovieId(String movieId);

    // 특정 상영관의 시간표 조회 (날짜 범위)
    List<Showtime> findByScreenIdAndStartTimeBetween(Long screenId, LocalDateTime start, LocalDateTime end);

    // 현재 시간 이후의 시간표 조회
    List<Showtime> findByStartTimeAfter(LocalDateTime now);

    // 영화별 + 날짜 범위 시간표 조회
    List<Showtime> findByMovieIdAndStartTimeBetween(String movieId, LocalDateTime start, LocalDateTime end);

    // 특정 영화관의 모든 상영관 시간표 조회 (날짜 범위)
    @Query("SELECT s FROM Showtime s " +
           "WHERE s.screen.theater.id = :theaterId " +
           "AND s.startTime BETWEEN :start AND :end " +
           "ORDER BY s.startTime")
    List<Showtime> findByTheaterIdAndDateRange(@Param("theaterId") Long theaterId,
                                                @Param("start") LocalDateTime start,
                                                @Param("end") LocalDateTime end);

    // 영화 + 영화관 + 날짜 범위 시간표 조회 (예매 페이지용)
    @Query("SELECT s FROM Showtime s " +
           "WHERE s.movieId = :movieId " +
           "AND s.screen.theater.id = :theaterId " +
           "AND s.startTime BETWEEN :start AND :end " +
           "ORDER BY s.startTime")
    List<Showtime> findByMovieIdAndTheaterIdAndDateRange(@Param("movieId") String movieId,
                                                          @Param("theaterId") Long theaterId,
                                                          @Param("start") LocalDateTime start,
                                                          @Param("end") LocalDateTime end);

    // 영화별 + 지역별 시간표 조회
    @Query("SELECT s FROM Showtime s " +
           "WHERE s.movieId = :movieId " +
           "AND s.screen.theater.region = :region " +
           "AND s.startTime >= :now " +
           "ORDER BY s.startTime")
    List<Showtime> findByMovieIdAndRegion(@Param("movieId") String movieId,
                                           @Param("region") String region,
                                           @Param("now") LocalDateTime now);

    // 영화별 + 체인별 시간표 조회
    @Query("SELECT s FROM Showtime s " +
           "WHERE s.movieId = :movieId " +
           "AND s.screen.theater.chain = :chain " +
           "AND s.startTime >= :now " +
           "ORDER BY s.startTime")
    List<Showtime> findByMovieIdAndChain(@Param("movieId") String movieId,
                                          @Param("chain") String chain,
                                          @Param("now") LocalDateTime now);

    // 지역별 상영 중인 영화 조회 (예매 페이지용)
    @Query("SELECT s FROM Showtime s " +
           "WHERE s.screen.theater.region = :region " +
           "AND s.startTime >= :now " +
           "ORDER BY s.movieId, s.startTime")
    List<Showtime> findByRegionAndStartTimeAfter(@Param("region") String region,
                                                  @Param("now") LocalDateTime now);
}
