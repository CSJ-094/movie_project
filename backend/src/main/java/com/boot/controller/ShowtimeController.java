package com.boot.controller;

import com.boot.dto.ShowtimeResponseDto;
import com.boot.service.ShowtimeService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/showtimes")
@RequiredArgsConstructor
public class ShowtimeController {

    private final ShowtimeService showtimeService;

    @Operation(summary = "영화별 시간표 조회", description = "특정 영화의 시간표를 조회합니다.")
    @GetMapping
    public ResponseEntity<List<ShowtimeResponseDto>> getShowtimes(
            @RequestParam(required = false) String movieId,
            @RequestParam(required = false) Long theaterId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String chain
    ) {
        List<ShowtimeResponseDto> showtimes;

        // 영화 + 영화관 + 날짜 조회 (예매 페이지에서 사용)
        if (movieId != null && theaterId != null && date != null) {
            showtimes = showtimeService.getShowtimesByMovieTheaterAndDate(movieId, theaterId, date);
        }
        // 영화관 + 날짜 조회
        else if (theaterId != null && date != null) {
            showtimes = showtimeService.getShowtimesByTheaterAndDate(theaterId, date);
        }
        // 영화 + 지역 조회
        else if (movieId != null && region != null) {
            showtimes = showtimeService.getShowtimesByMovieAndRegion(movieId, region);
        }
        // 영화 + 체인 조회
        else if (movieId != null && chain != null) {
            showtimes = showtimeService.getShowtimesByMovieAndChain(movieId, chain);
        }
        // 영화별 조회
        else if (movieId != null) {
            showtimes = showtimeService.getShowtimesByMovie(movieId);
        }
        else {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(showtimes);
    }

    @Operation(summary = "시간표 상세 조회", description = "시간표 ID로 상세 정보를 조회합니다.")
    @GetMapping("/{showtimeId}")
    public ResponseEntity<ShowtimeResponseDto> getShowtimeDetail(@PathVariable Long showtimeId) {
        ShowtimeResponseDto showtime = showtimeService.getShowtimeDetail(showtimeId);
        return ResponseEntity.ok(showtime);
    }
}
