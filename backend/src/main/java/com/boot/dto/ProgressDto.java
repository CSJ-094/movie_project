package com.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProgressDto {
    private Integer ratedCount;     //지금까지 평가한 개수
    private Integer targetCount;    // 목표 개수
}
