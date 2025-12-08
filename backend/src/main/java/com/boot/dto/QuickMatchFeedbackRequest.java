package com.boot.dto;

import lombok.Data;

@Data
public class QuickMatchFeedbackRequest {
    private String sessionId;
    private String movieId;
    private String action; // "like" or "dislike"
}
