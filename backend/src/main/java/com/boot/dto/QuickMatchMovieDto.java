package com.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuickMatchMovieDto {

    private String movieId;
    private String title;
    private String overview;
    private String posterUrl;
    private Float voteAverage;
    private String releaseDate;

    public static QuickMatchMovieDto from(MovieDoc doc) {
        if (doc == null) return null;

        return new QuickMatchMovieDto(
                doc.getMovieId(),
                doc.getTitle(),
                doc.getOverview(),
                doc.getPosterUrl(),
                doc.getVoteAverage(),
                doc.getReleaseDate()
        );
    }
}
