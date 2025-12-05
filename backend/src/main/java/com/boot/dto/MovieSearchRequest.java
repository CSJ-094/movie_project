package com.boot.dto;

import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class MovieSearchRequest {
	  @Schema(description = "검색어(키워드)", example = "AI 병기")
	    private String keyword;

	    @Schema(description = "현재 상영작 필터", example = "true")
	    private Boolean nowPlaying;

	    @Schema(description = "장르 필터", example = "[\"28\", \"878\"]") // 장르 ID로 변경
	    private List<Integer> genres;

	    @Schema(description = "최소 평점", example = "7.5")
	    private Float minRating;

	    @Schema(description = "개봉일 시작", example = "2020-01-01")
	    private LocalDate releaseDateFrom;

	    @Schema(description = "개봉일 종료", example = "2023-12-31")
	    private LocalDate releaseDateTo;

	    @Schema(description = "페이지 번호 (0부터 시작)", example = "0")
	    private Integer page = 0;

	    @Schema(description = "페이지 크기", example = "20")
	    private Integer size = 20;
}
