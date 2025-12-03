package com.boot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AutocompleteResponse {// 자동완성 검색어 응답 DTO

    @Schema(description = "자동완성 아이템 목록")
    private List<Item> items;

    @Data
    @Builder
    public static class Item {

        @Schema(description = "영화ID", example = "12345")
        private String movieId;

        @Schema(description = "영화 제목", example = "범죄도시")
        private String title;

        @Schema(description = "개봉일", example = "2023-05-01")
        private String releaseDate; // 옵션 필드
    }
}
