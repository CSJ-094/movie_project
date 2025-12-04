package com.boot.service;

import com.boot.dto.SearchHistoryDto; // SearchHistoryDto 임포트
import com.boot.entity.SearchHistory;
import com.boot.entity.User;
import com.boot.repository.SearchHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SearchHistoryService {

    private final SearchHistoryRepository searchHistoryRepository;
    private final UserService userService;
    private static final int MAX_HISTORY_ITEMS = 10; // 최대 검색 기록 개수

    // 현재 로그인한 사용자 정보 가져오기
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new IllegalStateException("로그인된 사용자 정보를 찾을 수 없습니다.");
        }
        String userEmail = authentication.getName();
        return userService.findByEmail(userEmail)
                .orElseThrow(() -> new NoSuchElementException("사용자를 찾을 수 없습니다: " + userEmail));
    }

    // 검색어 추가 (최대 개수 제한, 중복 제거)
    @Transactional
    public void addSearchQuery(String query) {
        if (query == null || query.trim().isEmpty()) {
            return;
        }
        User currentUser = getCurrentUser();
        String trimmedQuery = query.trim();

        // 중복 검색어 제거 (기존에 같은 검색어가 있으면 삭제 후 새로 추가)
        searchHistoryRepository.findByUserAndQuery(currentUser, trimmedQuery)
                .ifPresent(searchHistoryRepository::delete);

        // 새 검색어 추가
        SearchHistory newSearch = SearchHistory.builder()
                .user(currentUser)
                .query(trimmedQuery)
                .build();
        searchHistoryRepository.save(newSearch);

        // 최대 개수 초과 시 가장 오래된 검색어 삭제
        List<SearchHistory> history = searchHistoryRepository.findByUserOrderByCreatedAtDesc(currentUser);
        if (history.size() > MAX_HISTORY_ITEMS) {
            searchHistoryRepository.delete(history.get(history.size() - 1)); // 가장 오래된 항목 삭제
        }
    }

    // 현재 사용자의 검색 기록 가져오기 (ID와 함께 DTO 반환)
    @Transactional(readOnly = true)
    public List<SearchHistoryDto> getSearchHistory() { // 반환 타입 변경
        User currentUser = getCurrentUser();
        return searchHistoryRepository.findByUserOrderByCreatedAtDesc(currentUser).stream()
                .map(SearchHistoryDto::fromEntity) // DTO로 변환
                .collect(Collectors.toList());
    }

    // 특정 검색 기록 삭제
    @Transactional
    public void deleteSearchHistoryItem(Long historyId) {
        User currentUser = getCurrentUser();
        SearchHistory searchHistory = searchHistoryRepository.findById(historyId)
                .orElseThrow(() -> new NoSuchElementException("검색 기록을 찾을 수 없습니다: " + historyId));

        if (!searchHistory.getUser().getId().equals(currentUser.getId())) {
            throw new SecurityException("검색 기록을 삭제할 권한이 없습니다.");
        }
        searchHistoryRepository.delete(searchHistory);
    }

    // 모든 검색 기록 삭제
    @Transactional
    public void clearSearchHistory() {
        User currentUser = getCurrentUser();
        searchHistoryRepository.deleteByUser(currentUser);
    }
}
