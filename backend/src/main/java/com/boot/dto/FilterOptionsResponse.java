package com.boot.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FilterOptionsResponse {
    private List<GenreOption> genres;  // 장르 이름만 주던 걸 → id + name 세트로
    private Double minRating;   //ES에서 집계한 평점 최솟값
    private Double maxRating;   //ES에서 집계한 평점 최댓값
}
