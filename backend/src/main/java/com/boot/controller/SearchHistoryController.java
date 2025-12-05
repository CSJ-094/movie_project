package com.boot.controller;

import com.boot.dto.SearchHistoryDto; // SearchHistoryDto 임포트
import com.boot.service.SearchHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/search-history")
@RequiredArgsConstructor
public class SearchHistoryController {

    private final SearchHistoryService searchHistoryService;

    @Operation(summary = "검색어 추가", description = "현재 로그인한 사용자의 검색 기록에 검색어를 추가합니다.")
    @PostMapping
    public ResponseEntity<Void> addSearchQuery(@RequestBody Map<String, String> request) {
        String query = request.get("query");
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            searchHistoryService.addSearchQuery(query);
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (IllegalStateException e) { // 로그인되지 않은 사용자
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "검색 기록 조회", description = "현재 로그인한 사용자의 최근 검색 기록을 조회합니다.")
    @GetMapping
    public ResponseEntity<List<SearchHistoryDto>> getSearchHistory() { // 반환 타입 변경
        try {
            List<SearchHistoryDto> history = searchHistoryService.getSearchHistory(); // DTO 반환
            return ResponseEntity.ok(history);
        } catch (IllegalStateException e) { // 로그인되지 않은 사용자
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "특정 검색 기록 삭제", description = "현재 로그인한 사용자의 특정 검색 기록을 삭제합니다.")
    @DeleteMapping("/{historyId}")
    public ResponseEntity<Void> deleteSearchHistoryItem(@PathVariable Long historyId) {
        try {
            searchHistoryService.deleteSearchHistoryItem(historyId);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (SecurityException e) { // 권한 없음
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (IllegalStateException e) { // 로그인되지 않은 사용자
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "모든 검색 기록 삭제", description = "현재 로그인한 사용자의 모든 검색 기록을 삭제합니다.")
    @DeleteMapping
    public ResponseEntity<Void> clearSearchHistory() {
        try {
            searchHistoryService.clearSearchHistory();
            return ResponseEntity.noContent().build();
        } catch (IllegalStateException e) { // 로그인되지 않은 사용자
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
