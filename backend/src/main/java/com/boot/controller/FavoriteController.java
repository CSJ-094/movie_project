package com.boot.controller;

import com.boot.service.FavoriteService;
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

    // 영화 찜 토글 (추가/삭제)
    @PostMapping("/{movieId}")
    public ResponseEntity<Map<String, Boolean>> toggleFavorite(
            @PathVariable("movieId") String movieId, // Long -> String
            Authentication authentication) {
        String userEmail = authentication.getName();
        boolean isFavorited = favoriteService.toggleFavorite(userEmail, movieId);
        return ResponseEntity.ok(Collections.singletonMap("isFavorited", isFavorited));
    }

    // 특정 영화의 찜 상태 확인
    @GetMapping("/{movieId}")
    public ResponseEntity<Map<String, Boolean>> checkFavoriteStatus(
            @PathVariable("movieId") String movieId, // Long -> String
            Authentication authentication) {
        String userEmail = authentication.getName();
        boolean isFavorited = favoriteService.isFavorite(userEmail, movieId);
        return ResponseEntity.ok(Collections.singletonMap("isFavorited", isFavorited));
    }

    // 현재 사용자가 찜한 모든 영화 ID 목록 조회
    @GetMapping
    public ResponseEntity<List<String>> getFavoriteMovies(Authentication authentication) { // List<Long> -> List<String>
        String userEmail = authentication.getName();
        List<String> favoriteMovieIds = favoriteService.getFavoriteMovieIds(userEmail);
        return ResponseEntity.ok(favoriteMovieIds);
    }
}
