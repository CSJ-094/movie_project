package com.boot.dto;

import lombok.Data;

import java.util.List;

@Data
public class TmdbReviewResponse { //Tmdb api 응답 매핑용
    private int id;
    private int page;
    private List<TmdbReview> results;

    @Data
    public static class TmdbReview {
        private String id;
        private String author;
        private String content;
        private String url;
        private String created_at;
        private AuthorDetails author_details;

        @Data
        public static class AuthorDetails {
            private String name;
            private String username;
            private String avatar_path;
            private Double rating; // 0~10 점수 (없을 수도 있음)
        }
    }
}
