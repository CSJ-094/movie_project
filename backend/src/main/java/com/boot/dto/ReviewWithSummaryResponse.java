package com.boot.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ReviewWithSummaryResponse { //영화 하나에 대한 통합 응답

    private String movieId;                 // TMDB 영화 ID (문자열)
    private List<MovieReviewDto> reviews;   // 내부 + TMDB 리뷰들
    private ReviewSummaryDto summary;       // AI 요약 결과
}
