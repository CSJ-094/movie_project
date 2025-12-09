package com.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class QuickMatchFeedbackResponse {
    private String sessionId;
    private Integer ratedCount;
    private Integer targetCount;
}
