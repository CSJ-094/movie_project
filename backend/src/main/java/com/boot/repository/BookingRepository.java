package com.boot.repository;

import com.boot.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    // 사용자별 예매 내역 조회
    List<Booking> findByUserId(Long userId);

    // 특정 시간표의 예매 내역 조회
    List<Booking> findByShowtimeId(Long showtimeId);

    // 사용자별 예매 내역 조회 (상태별)
    List<Booking> findByUserIdAndBookingStatus(Long userId, String bookingStatus);

    // 사용자별 예매 내역 조회 (최신순)
    List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId);

    // 특정 시간표의 확정된 예매 개수
    @Query("SELECT COUNT(b) FROM Booking b " +
           "WHERE b.showtime.id = :showtimeId " +
           "AND b.bookingStatus = 'CONFIRMED'")
    Long countConfirmedBookingsByShowtimeId(@Param("showtimeId") Long showtimeId);

    // 특정 시간표의 예약된 좌석 목록
    @Query("SELECT b.seats FROM Booking b " +
           "WHERE b.showtime.id = :showtimeId " +
           "AND b.bookingStatus = 'CONFIRMED'")
    List<String> findBookedSeatsByShowtimeId(@Param("showtimeId") Long showtimeId);
}
