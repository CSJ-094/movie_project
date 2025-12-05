package com.boot.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReviewRequestDto {
    private String movieId;
    private Integer rating;
    private String comment;
}
