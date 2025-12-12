package com.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class QuickMatchResultSummaryDto {

    private int likedCount;
    private int dislikedCount;

    private List<QuickMatchGenrePreferenceDto> topGenres;//상위 장르들

    private String preferredYearRange;//선호 연도 범위
    private List<String> preferredCountry; //선호 국가들
    private List<String> preferredMood; //선호 무드들

    private String tasteTypeName;//선호 취향 유형 이름
    private Double avgLikedRating;//좋아요 누른 영화들의 평균 평점
    private List<String> mainKeywords;//주요 키워드들
}

