package com.boot.controller;

import com.boot.dto.MovieDoc;
import com.boot.service.FavoriteService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @Operation(summary = "영화 찜 토글", description = "특정 영화를 찜 목록에 추가하거나 제거합니다.")
    @PostMapping("/{movieId}")
    public ResponseEntity<Map<String, Boolean>> toggleFavorite(
            @PathVariable("movieId") String movieId,
            Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }
        String userEmail = authentication.getName();
        boolean isFavorited = favoriteService.toggleFavorite(userEmail, movieId);
        return ResponseEntity.ok(Collections.singletonMap("isFavorited", isFavorited));
    }

    @Operation(summary = "특정 영화의 찜 상태 확인", description = "특정 영화가 현재 사용자의 찜 목록에 있는지 확인합니다.")
    @GetMapping("/{movieId}")
    public ResponseEntity<Map<String, Boolean>> checkFavoriteStatus(
            @PathVariable("movieId") String movieId,
            Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.ok(Collections.singletonMap("isFavorited", false));
        }
        String userEmail = authentication.getName();
        boolean isFavorited = favoriteService.isFavorite(userEmail, movieId);
        return ResponseEntity.ok(Collections.singletonMap("isFavorited", isFavorited));
    }

    @Operation(summary = "현재 사용자가 찜한 모든 영화 ID 목록 조회", description = "현재 사용자의 찜 목록에 있는 모든 영화의 ID를 조회합니다.")
    @GetMapping
    public ResponseEntity<List<String>> getFavoriteMovies(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        String userEmail = authentication.getName();
        List<String> favoriteMovieIds = favoriteService.getFavoriteMovieIds(userEmail);
        return ResponseEntity.ok(favoriteMovieIds);
    }

    @Operation(summary = "현재 사용자가 찜한 모든 영화 상세 정보 조회", description = "메인 페이지의 '찜한 영화' 섹션을 위해 사용됩니다.")
    @GetMapping("/details")
    public ResponseEntity<List<MovieDoc>> getFavoriteMovieDetails() {
        return ResponseEntity.ok(favoriteService.getFavoriteMovieDetailsForCurrentUser());
    }
}
