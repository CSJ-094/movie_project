package com.boot.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ShowtimeInfoDto {
    private Long showtimeId;
    private String theaterName;
    private String screenName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}
