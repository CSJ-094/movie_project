package com.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class QuickMatchRecommendationDto {

    private String movieId;
    private String title;
    private String posterUrl;
    private String reason;  // 추천 이유
}
