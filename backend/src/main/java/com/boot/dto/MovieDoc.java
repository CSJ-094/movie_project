package com.boot.dto;

import lombok.Data;

import java.util.List;

@Data
public class MovieDoc { // 영화 한 개
	private String movieId;
    private String title;
    private String overview;
    private String posterUrl;
    private Float voteAverage;
    private String releaseDate;
    private Boolean isNowPlaying;
    private List<String> ottProviders;
    private String ottLink;
}
