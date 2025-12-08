package com.boot.controller;


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

    // 내부 리뷰 + TMDB 리뷰 + AI 요약을 한 번에 돌려주는 API
    @GetMapping("/{movieId}/reviews-with-summary")
    public ReviewWithSummaryResponse getReviewsWithSummary(@PathVariable String movieId) {
        return movieReviewQueryService.getReviewsWithSummary(movieId);
    }
}
