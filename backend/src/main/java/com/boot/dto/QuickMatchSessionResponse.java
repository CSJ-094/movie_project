package com.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class QuickMatchSessionResponse {
    private String sessionId;
    private Integer targetCount;
}
