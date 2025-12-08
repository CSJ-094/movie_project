package com.boot.dto;

import lombok.Data;

@Data
public class CreateQuickMatchSessionRequest {
    // 프론트에서 targetCount를 보낼 수도 있고 안 보낼 수도 있어서 Integer로 함
    private Integer targetCount;
}
