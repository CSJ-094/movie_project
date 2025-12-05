package com.boot.controller;

import com.boot.dto.WatchlistMovieDto; // WatchlistMovieDto 임포트
import com.boot.service.WatchlistService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/watchlist")
@RequiredArgsConstructor
public class WatchlistController {

    private final WatchlistService watchlistService;

    @Operation(summary = "Watchlist 토글", description = "특정 영화를 Watchlist에 추가하거나 제거합니다. 추가/제거 여부를 반환합니다.")
    @PostMapping("/{movieId}")
    public ResponseEntity<Boolean> toggleWatchlist(@PathVariable("movieId") String movieId) {
        boolean added = watchlistService.toggleWatchlist(movieId);
        return ResponseEntity.ok(added);
    }

    @Operation(summary = "Watchlist에 영화 존재 여부 확인", description = "특정 영화가 현재 사용자의 Watchlist에 있는지 확인합니다.")
    @GetMapping("/{movieId}")
    public ResponseEntity<Boolean> isMovieInWatchlist(@PathVariable("movieId") String movieId) {
        try {
            boolean isInWatchlist = watchlistService.isMovieInWatchlist(movieId);
            return ResponseEntity.ok(isInWatchlist);
        } catch (IllegalStateException e) {
            // 로그인되지 않은 사용자는 Watchlist에 없는 것으로 처리
            return ResponseEntity.ok(false);
        }
    }

    @Operation(summary = "현재 사용자의 Watchlist 영화 목록 조회", description = "현재 로그인한 사용자의 Watchlist에 있는 모든 영화 ID와 시청 완료 상태를 조회합니다.")
    @GetMapping
    public ResponseEntity<List<WatchlistMovieDto>> getWatchlistMovies() { // 메서드 이름 변경 및 반환 타입 변경
        List<WatchlistMovieDto> watchlist = watchlistService.getWatchlistMovies();
        return ResponseEntity.ok(watchlist);
    }

    @Operation(summary = "Watchlist 영화 시청 완료 상태 토글", description = "Watchlist에 있는 특정 영화의 시청 완료 상태를 토글합니다.")
    @PatchMapping("/{movieId}/watched")
    public ResponseEntity<Boolean> toggleWatchedStatus(@PathVariable("movieId") String movieId) {
        boolean newWatchedStatus = watchlistService.toggleWatchedStatus(movieId);
        return ResponseEntity.ok(newWatchedStatus);
    }
}
