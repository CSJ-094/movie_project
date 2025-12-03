package com.boot.dto;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MovieSearchResponse {
    private long totalHits;      // 전체 검색 결과 수
    private int page;            // 현재 페이지 번호
    private int size;            // 페이지 크기
    private List<MovieDoc> movies; // 실제 영화 리스트
}
