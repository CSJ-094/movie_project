package com.boot.controller;

import java.util.List;

import com.boot.dto.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam; // @RequestParam 임포트 추가
import org.springframework.web.bind.annotation.RestController;

import com.boot.service.MovieSearchService;
import com.boot.elastic.Movie;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/movies")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class MovieSearchController {

    private final MovieSearchService movieSearchService;

    @Operation(summary = "영화 검색 API", description = "검색어 + 필터(장르, 최신작, 평점, 기간) + 랭킹/부스팅 적용 검색 API")
    @GetMapping("/search")
    public MovieSearchResponse search(MovieSearchRequest request) {
        log.info("Search request: {}", request);
        return movieSearchService.search(request);
    }

    @Operation(summary = "영화 자동완성 검색어 API", description = "입력된 키워드 기반으로 영화 제목 자동완성 검색어를 제공하는 API")
    @GetMapping("/autocomplete")
    public ResponseEntity<AutocompleteResponse> autocomplete(AutocompleteRequest request) {
        return ResponseEntity.ok(movieSearchService.autocomplete(request));
    }

    @Operation(summary = "필터 옵션 조회 API", description = "영화 검색 화면에서 사용할 장르 목록과 평점 범위를 반환")
    @GetMapping("/filters")
    public ResponseEntity<FilterOptionsResponse> getFilters() {
        return ResponseEntity.ok(movieSearchService.getFilterOptions());
    }

    @Operation(summary = "영화 상세 조회 API", description = "영화 ID로 상세 정보를 조회합니다.")
    @GetMapping("/{id}")
    public ResponseEntity<Movie> getMovieById(@PathVariable("id") String id) {
        Movie movie = movieSearchService.getMovieById(id);
        if (movie != null) {
            return ResponseEntity.ok(movie);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{movieId}/recommendations")
    public ResponseEntity<List<MovieDoc>> getRecommendations(@PathVariable("movieId") String movieId) {
        List<MovieDoc> recommendations = movieSearchService.recommend(movieId);
        return ResponseEntity.ok(recommendations);
    }

    @Operation(summary = "오타 교정 제안 API", description = "입력된 키워드에 대한 오타 교정 제안을 제공하는 API")
    @GetMapping("/suggest")
    public ResponseEntity<List<String>> suggestKeywords(@RequestParam("keyword") String keyword) {
        List<String> suggestions = movieSearchService.suggestKeywords(keyword);
        return ResponseEntity.ok(suggestions);
    }
}
