package com.boot.controller;

import com.boot.dto.BookingMovieDto;
import com.boot.dto.BookingRequestDto;
import com.boot.dto.BookingResponseDto;
import com.boot.service.BookingService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @Operation(summary = "예매 가능한 영화 목록 조회", description = "지역별 실제 상영 중인 영화 목록을 조회합니다.")
    @GetMapping("/movies")
    public ResponseEntity<List<BookingMovieDto>> getBookingMovies(@RequestParam String region) {
        List<BookingMovieDto> movies = bookingService.getBookingMovies(region);
        return ResponseEntity.ok(movies);
    }

    @Operation(summary = "예매 생성", description = "새로운 예매를 생성합니다.")
    @PostMapping
    public ResponseEntity<BookingResponseDto> createBooking(@RequestBody BookingRequestDto request) {
        try {
            BookingResponseDto booking = bookingService.createBooking(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(booking);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build(); // 좌석 부족
        }
    }

    @Operation(summary = "사용자별 예매 내역 조회", description = "특정 사용자의 모든 예매 내역을 조회합니다.")
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<BookingResponseDto>> getUserBookings(@PathVariable("userId") Long userId) {
        List<BookingResponseDto> bookings = bookingService.getUserBookings(userId);
        return ResponseEntity.ok(bookings);
    }

    @Operation(summary = "예매 상세 조회", description = "예매 ID로 상세 정보를 조회합니다.")
    @GetMapping("/{bookingId}")
    public ResponseEntity<BookingResponseDto> getBookingDetail(@PathVariable Long bookingId) {
        try {
            BookingResponseDto booking = bookingService.getBookingDetail(bookingId);
            return ResponseEntity.ok(booking);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @Operation(summary = "예매 취소", description = "예매를 취소하고 좌석을 복구합니다.")
    @DeleteMapping("/{bookingId}")
    public ResponseEntity<Void> cancelBooking(@PathVariable Long bookingId) {
        try {
            bookingService.cancelBooking(bookingId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    }

    @Operation(summary = "예약된 좌석 조회", description = "특정 시간표의 예약된 좌석 목록을 조회합니다.")
    @GetMapping("/showtime/{showtimeId}/booked-seats")
    public ResponseEntity<List<String>> getBookedSeats(@PathVariable Long showtimeId) {
        List<String> bookedSeats = bookingService.getBookedSeats(showtimeId);
        return ResponseEntity.ok(bookedSeats);
    }
}
