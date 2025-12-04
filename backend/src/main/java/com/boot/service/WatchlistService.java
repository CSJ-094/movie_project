package com.boot.service;

import com.boot.dto.WatchlistMovieDto; // WatchlistMovieDto 임포트
import com.boot.entity.User;
import com.boot.entity.Watchlist;
import com.boot.repository.WatchlistRepository;
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
public class WatchlistService {

    private final WatchlistRepository watchlistRepository;
    private final UserService userService;

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

    // Watchlist에 영화 추가/제거 토글
    @Transactional
    public boolean toggleWatchlist(String movieId) {
        User currentUser = getCurrentUser();
        Optional<Watchlist> existingWatchlist = watchlistRepository.findByUserAndMovieId(currentUser, movieId);

        if (existingWatchlist.isPresent()) {
            // 이미 Watchlist에 있으면 제거
            watchlistRepository.delete(existingWatchlist.get());
            return false; // 제거됨
        } else {
            // 없으면 추가 (watched 기본값은 false)
            Watchlist watchlist = Watchlist.builder()
                    .user(currentUser)
                    .movieId(movieId)
                    .watched(false) // 초기값 false 명시
                    .build();
            watchlistRepository.save(watchlist);
            return true; // 추가됨
        }
    }

    // 특정 영화가 현재 사용자의 Watchlist에 있는지 확인
    @Transactional(readOnly = true)
    public boolean isMovieInWatchlist(String movieId) {
        User currentUser = getCurrentUser();
        return watchlistRepository.findByUserAndMovieId(currentUser, movieId).isPresent();
    }

    // 현재 사용자의 모든 Watchlist 영화 ID 및 시청 완료 상태 목록 가져오기
    @Transactional(readOnly = true)
    public List<WatchlistMovieDto> getWatchlistMovies() { // 메서드 이름 변경 및 반환 타입 변경
        User currentUser = getCurrentUser();
        return watchlistRepository.findByUser(currentUser).stream()
                .map(WatchlistMovieDto::fromEntity)
                .collect(Collectors.toList());
    }

    // Watchlist 영화의 시청 완료 상태 토글
    @Transactional
    public boolean toggleWatchedStatus(String movieId) {
        User currentUser = getCurrentUser();
        Watchlist watchlist = watchlistRepository.findByUserAndMovieId(currentUser, movieId)
                .orElseThrow(() -> new NoSuchElementException("Watchlist에서 영화를 찾을 수 없습니다: " + movieId));
        
        watchlist.toggleWatched(); // Watchlist 엔티티의 toggleWatched 메서드 사용
        watchlistRepository.save(watchlist);
        return watchlist.isWatched(); // 변경된 상태 반환
    }
}
