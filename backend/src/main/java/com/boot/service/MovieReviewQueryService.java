package com.boot.service;

import com.boot.dto.MovieReviewDto;
import com.boot.dto.ReviewSummaryDto;
import com.boot.dto.ReviewWithSummaryResponse;
import com.boot.entity.Review;
import com.boot.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MovieReviewQueryService {

    private final ReviewRepository reviewRepository;          // 기존 JPA Repo 사용
    private final ExternalReviewService externalReviewService;
    private final ReviewAiSummaryService reviewAiSummaryService;

    public ReviewWithSummaryResponse getReviewsWithSummary(String movieId) {

        // 1) 내부 리뷰
        List<Review> internalReviews = reviewRepository.findByMovieId(movieId);

        List<MovieReviewDto> internalDtos = internalReviews.stream()
                .map(r -> MovieReviewDto.builder()
                        .source("INTERNAL")
                        .author(r.getUser().getName())
                        .content(r.getComment())
                        .rating(r.getRating() != null ? r.getRating().doubleValue() : null)
                        .createdAt(r.getCreatedAt() != null ? r.getCreatedAt().toString() : null)
                        .build())
                .toList();

        // 2) TMDB 리뷰
        List<MovieReviewDto> tmdbDtos = externalReviewService.getTmdbReviews(movieId);

        // 3) 합치기
        List<MovieReviewDto> allReviews = new ArrayList<>();
        allReviews.addAll(internalDtos);
        allReviews.addAll(tmdbDtos);

        // 4) AI 요약 (너무 많으면 30개까지만 사용)
        List<MovieReviewDto> limited = allReviews.stream()
                .limit(30)
                .toList();

        ReviewSummaryDto summary = reviewAiSummaryService.summarize(limited);

        return ReviewWithSummaryResponse.builder()
                .movieId(movieId)
                .reviews(allReviews)
                .summary(summary)
                .build();
    }
}
