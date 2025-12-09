package com.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class QuickMatchGenrePreferenceDto {
    private String name;    // 예 : "액션"
    private double ratio;   // 예 : 0.25
}
