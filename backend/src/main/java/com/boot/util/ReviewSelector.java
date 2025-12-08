package com.boot.util;

import com.boot.dto.MovieReviewDto;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
public class ReviewSelector {

    private static final int MAX_REVIEWS = 10;

    public List<MovieReviewDto> select(List<MovieReviewDto> reviews) {

        if (reviews == null || reviews.isEmpty()) {
            return List.of();
        }

        if (reviews.size() <= MAX_REVIEWS) {
            return reviews; // 그냥 전체 사용
        }

        // null rating 은 중립으로 취급
        List<MovieReviewDto> withRating = reviews.stream()
                .peek(r -> { if (r.getRating() == null) r.setRating(5.0); }) // 기본값 5점
                .collect(Collectors.toList());

        // 1) 평점 높은 리뷰 Top3
        List<MovieReviewDto> topPositive = withRating.stream()
                .sorted(Comparator.comparing(MovieReviewDto::getRating).reversed())
                .limit(3)
                .collect(Collectors.toList());

        // 2) 평점 낮은 리뷰 Bottom3
        List<MovieReviewDto> topNegative = withRating.stream()
                .sorted(Comparator.comparing(MovieReviewDto::getRating))
                .limit(3)
                .collect(Collectors.toList());

        // 3) 중간 평점 리뷰 2개
        double avg = withRating.stream()
                .mapToDouble(MovieReviewDto::getRating)
                .average()
                .orElse(5.0);

        List<MovieReviewDto> mid = withRating.stream()
                .sorted(Comparator.comparingDouble(r -> Math.abs(r.getRating() - avg)))
                .limit(2)
                .collect(Collectors.toList());

        // 4) 리뷰 길이 긴 리뷰 2개
        List<MovieReviewDto> longReviews = withRating.stream()
                .sorted(Comparator.comparingInt(r -> -r.getContent().length()))
                .limit(2)
                .collect(Collectors.toList());


        // 중복 제거를 위해 Set 사용
        Set<MovieReviewDto> finalSet = new LinkedHashSet<>();
        finalSet.addAll(topPositive);
        finalSet.addAll(topNegative);
        finalSet.addAll(mid);
        finalSet.addAll(longReviews);

        // 혹시 10개보다 적을 경우 나머지는 랜덤 추가
        if (finalSet.size() < MAX_REVIEWS) {
            List<MovieReviewDto> remain = new ArrayList<>(reviews);
            remain.removeAll(finalSet);
            Collections.shuffle(remain);

            finalSet.addAll(remain.subList(
                    0,
                    Math.min(MAX_REVIEWS - finalSet.size(), remain.size())
            ));
        }

        // 정확히 10개만 반환
        return finalSet.stream()
                .limit(MAX_REVIEWS)
                .collect(Collectors.toList());
    }
}
