package com.boot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class AutocompleteRequest { // 자동완성 검색어 요청 DTO
    @Schema(description = "자동완성 검색어", example = "범죄")
    private String keyword;

    @Schema(description = "최대 결과 수", example = "10")
    private Integer size = 10; // 기본값 10
}
