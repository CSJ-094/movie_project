package com.boot.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.boot.dto.MovieSearchResponse;
import com.boot.service.MovieSearchService;
import com.boot.dto.MovieSearchRequest;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;


@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
public class MovieSearchController {

    private final MovieSearchService movieSearchService;

    @Operation(
            summary = "영화 검색 API",
            description = "검색어 + 필터(장르, 최신작, 평점, 기간) + 랭킹/부스팅 적용 검색 API"
    )
    @GetMapping("/search")
    public MovieSearchResponse search(MovieSearchRequest request) {
        return movieSearchService.search(request);
    }
}
