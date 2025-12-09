package com.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class NextMovieResponse {
    private String sessionId;
    private QuickMatchMovieDto movie;
    private ProgressDto progress;
}
