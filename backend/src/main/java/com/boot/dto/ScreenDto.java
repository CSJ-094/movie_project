package com.boot.dto;

import com.boot.entity.Screen;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ScreenDto {
    private Long id;
    private Long theaterId;
    private String theaterName;
    private String name;
    private Integer totalSeats;
    private String screenType;

    public static ScreenDto fromEntity(Screen screen) {
        return ScreenDto.builder()
                .id(screen.getId())
                .theaterId(screen.getTheater().getId())
                .theaterName(screen.getTheater().getName())
                .name(screen.getName())
                .totalSeats(screen.getTotalSeats())
                .screenType(screen.getScreenType())
                .build();
    }
}
