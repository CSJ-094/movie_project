package com.boot.dto;

import com.boot.entity.Theater;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TheaterDto {
    private Long id;
    private String name;
    private String chain;
    private String region;
    private String city;
    private String address;
    private Double latitude;
    private Double longitude;

    public static TheaterDto fromEntity(Theater theater) {
        return TheaterDto.builder()
                .id(theater.getId())
                .name(theater.getName())
                .chain(theater.getChain())
                .region(theater.getRegion())
                .city(theater.getCity())
                .address(theater.getAddress())
                .latitude(theater.getLatitude())
                .longitude(theater.getLongitude())
                .build();
    }
}
