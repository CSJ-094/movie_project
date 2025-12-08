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
}
