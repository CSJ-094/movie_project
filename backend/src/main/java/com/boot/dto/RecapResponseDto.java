package com.boot.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class RecapResponseDto {
    private String userName;
    private ActivitySummary activitySummary;
    private WatchedAnalysis watchedAnalysis;
    private RatingAnalysis ratingAnalysis;
    private WatchlistAnalysis watchlistAnalysis;
    private Awards awards;

    @Data
    @Builder
    public static class ActivitySummary {
        private int totalActivityCount; // watched + rated + reviewed + liked
        private String mostActiveMonth; // e.g. "7월"
    }

    @Data
    @Builder
    public static class WatchedAnalysis {
        private int totalWatchedCount;
        private long totalRuntimeMinutes;
        private String topGenre;
        private String topEra; // e.g. "1990년대"
    }

    @Data
    @Builder
    public static class RatingAnalysis {
        private double averageRating;
        private int totalReviews;
        private MovieSummary topRatedMovie; // User's highest rated
        private MovieSummary hiddenGem; // User rated high but global average is low
        // private String ratingTendency; // "Generous", "Critical" (Optional logic)
    }

    @Data
    @Builder
    public static class WatchlistAnalysis {
        private int totalWatchlistCount;
        private String topGenreInWatchlist;
    }

    @Data
    @Builder
    public static class Awards {
        // private String mostWatchedActor; // Omitted due to missing data
        private String title; // "Movie Explorer", "Cinephile" etc.
    }

    @Data
    @Builder
    public static class MovieSummary {
        private String movieId;
        private String title;
        private String posterUrl;
        private double userRating;
        private double globalRating;
    }
}
