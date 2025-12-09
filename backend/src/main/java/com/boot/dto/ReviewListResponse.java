package com.boot.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ReviewListResponse {

    private String movieId;     // 영화 ID
    private List<MovieReviewDto> reviews;   //내부+TMDB 리뷰
}
