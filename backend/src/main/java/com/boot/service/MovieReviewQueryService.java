package com.boot.service;

import com.boot.dto.MovieReviewDto;
import com.boot.dto.ReviewListResponse;
import com.boot.dto.ReviewSummaryDto;
import com.boot.dto.ReviewWithSummaryResponse;
import com.boot.entity.MovieReviewSummary;
import com.boot.entity.Review;
import com.boot.repository.MovieReviewSummaryRepository;
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
    private final MovieReviewSummaryRepository movieReviewSummaryRepository;

    // 리뷰만 반환 (대표 N개)
    public ReviewListResponse getReviewList(String movieId, int limit) {

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
        List<MovieReviewDto> all = new ArrayList<>();
        all.addAll(internalDtos);
        all.addAll(tmdbDtos);

        // 4) limit 만큼만 잘라서 반환 (대표 리뷰 용도)
        List<MovieReviewDto> limited = all.stream()
                .limit(limit)
                .toList();

        return ReviewListResponse.builder()
                .movieId(movieId)
                .reviews(limited)
                .build();
    }

    // 리뷰 요약만 반환
    public ReviewSummaryDto getSummaryOnly(String movieId) {

        // 0) 기존 요약 있으면 바로 리턴
        return movieReviewSummaryRepository.findByMovieId(movieId)
                .map(this::toDto)
                .orElseGet(() -> createSummary(movieId));
    }

    private ReviewSummaryDto toDto(MovieReviewSummary entity) {
        return ReviewSummaryDto.builder()
                .goodPoints(entity.getGoodPoints())
                .badPoints(entity.getBadPoints())
                .overall(entity.getOverall())
                .positiveRatio(entity.getPositiveRatio())
                .negativeRatio(entity.getNegativeRatio())
                .neutralRatio(entity.getNeutralRatio())
                .build();
    }

    private ReviewSummaryDto createSummary(String movieId) {
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
        List<MovieReviewDto> all = new ArrayList<>();
        all.addAll(internalDtos);
        all.addAll(tmdbDtos);

        // 4) 너무 많으면 30개까지만 요약에 사용
        List<MovieReviewDto> limited = all.stream()
                .limit(30)
                .toList();

        // 리뷰가 아예 없으면 빈 요약 리턴
        if (limited.isEmpty()) {
            return ReviewSummaryDto.builder()
                    .goodPoints("리뷰가 부족하여 요약할 수 없습니다.")
                    .badPoints("")
                    .overall("")
                    .positiveRatio(0.0)
                    .negativeRatio(0.0)
                    .neutralRatio(0.0)
                    .build();
        }

        // 5) AI 요약 생성
        ReviewSummaryDto summaryDto = reviewAiSummaryService.summarize(limited);

        // 6) DB 저장
        MovieReviewSummary entity = MovieReviewSummary.builder()
                .movieId(movieId)
                .goodPoints(summaryDto.getGoodPoints())
                .badPoints(summaryDto.getBadPoints())
                .overall(summaryDto.getOverall())
                .positiveRatio(summaryDto.getPositiveRatio())
                .negativeRatio(summaryDto.getNegativeRatio())
                .neutralRatio(summaryDto.getNeutralRatio())
                .lastUpdated(java.time.LocalDateTime.now())
                .build();

        movieReviewSummaryRepository.save(entity);

        return summaryDto;
    }


    // 추후 삭제 예정
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
