package com.boot.dto;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MovieSearchResponse {

	private long totalHits;
    private int page;
    private int size;
    private List<MovieDoc> movies;
}
