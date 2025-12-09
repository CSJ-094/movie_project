package com.boot.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MovieReviewDto { //내부/외부 리뷰 공통 모델
    private String source;  // INTERNAL, TMDB 구분
    private String author;  // 작성자 이름/닉네임
    private String content; // 리뷰 내용
    private Double rating; // 평점 (없으면 null)
    private String createdAt; //생성일
    private String translated;  // 한국어 번역본
}
