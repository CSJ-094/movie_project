package com.boot.controller;

import com.boot.service.RatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ratings")
@RequiredArgsConstructor
public class RatingController {

    private final RatingService ratingService;

    // 영화에 별점 추가/수정
    @PostMapping("/{movieId}")
    public ResponseEntity<Void> addOrUpdateRating(
            @PathVariable String movieId, // Long -> String
            @RequestBody Map<String, Double> payload,
            Authentication authentication) {
        String userEmail = authentication.getName();
        Double rating = payload.get("rating");
        if (rating == null || rating < 0.5 || rating > 5.0) {
            return ResponseEntity.badRequest().build();
        }
        ratingService.addOrUpdateRating(userEmail, movieId, rating);
        return ResponseEntity.ok().build();
    }

    // 현재 사용자가 매긴 모든 별점 정보 조회
    @GetMapping
    public ResponseEntity<Map<String, Double>> getUserRatings(Authentication authentication) { // Map<Long, Double> -> Map<String, Double>
        String userEmail = authentication.getName();
        Map<String, Double> userRatings = ratingService.getRatingsByUser(userEmail);
        return ResponseEntity.ok(userRatings);
    }
}
