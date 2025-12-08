package com.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class QuickMatchResultResponse {

    private QuickMatchResultSummaryDto summary;
    private List<QuickMatchRecommendationDto> recommendations;
}
