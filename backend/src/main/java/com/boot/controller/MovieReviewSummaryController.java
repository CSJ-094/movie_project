package com.boot.controller;

import com.boot.dto.ReviewListResponse;
import com.boot.dto.ReviewSummaryDto;
import com.boot.dto.ReviewWithSummaryResponse;
import com.boot.service.MovieReviewQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
public class MovieReviewSummaryController {

    private final MovieReviewQueryService movieReviewQueryService;

    // 1) 리뷰 리스트만 (대표 N개)
    @GetMapping("/{movieId}/reviews")
    public ReviewListResponse getReviewList(
            @PathVariable("movieId") String movieId,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "10") int limit) {
        return movieReviewQueryService.getReviewList(movieId, limit);
    }

    // 2) 요약만
    @GetMapping("/{movieId}/review-summary")
    public ReviewSummaryDto getReviewSummary(@PathVariable("movieId") String movieId) {
        return movieReviewQueryService.getSummaryOnly(movieId);
    }

    // 내부 리뷰 + TMDB 리뷰 + AI 요약을 한 번에 돌려주는 API
    @GetMapping("/{movieId}/reviews-with-summary")
    public ReviewWithSummaryResponse getReviewsWithSummary(@PathVariable("movieId") String movieId) {
        return movieReviewQueryService.getReviewsWithSummary(movieId);
    }
}
