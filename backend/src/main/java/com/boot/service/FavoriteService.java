package com.boot.service;

import com.boot.dto.MovieDoc;
import com.boot.elastic.Movie;
import com.boot.entity.Favorite;
import com.boot.entity.User;
import com.boot.repository.FavoriteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final UserService userService;
    private final MovieSearchService movieSearchService;

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new IllegalStateException("로그인이 필요합니다.");
        }
        String userEmail = authentication.getName();
        return userService.findByEmail(userEmail)
                .orElseThrow(() -> new NoSuchElementException("사용자를 찾을 수 없습니다."));
    }

    // 찜 추가/삭제 토글
    public boolean toggleFavorite(String userEmail, String movieId) {
        User user = userService.findByEmail(userEmail)
                .orElseThrow(() -> new NoSuchElementException("사용자를 찾을 수 없습니다."));

        return favoriteRepository.findByUserAndMovieId(user, movieId)
                .map(favorite -> {
                    // 이미 찜한 경우, 삭제
                    favoriteRepository.delete(favorite);
                    return false; // 찜 해제됨
                })
                .orElseGet(() -> {
                    // 찜하지 않은 경우, 추가
                    favoriteRepository.save(new Favorite(user, movieId));
                    return true; // 찜 추가됨
                });
    }

    // 특정 영화에 대한 찜 상태 확인
    @Transactional(readOnly = true)
    public boolean isFavorite(String userEmail, String movieId) {
        User user = userService.findByEmail(userEmail)
                .orElseThrow(() -> new NoSuchElementException("사용자를 찾을 수 없습니다."));
        return favoriteRepository.existsByUserAndMovieId(user, movieId);
    }

    // 사용자가 찜한 모든 영화 ID 목록 조회
    @Transactional(readOnly = true)
    public List<String> getFavoriteMovieIds(String userEmail) {
        User user = userService.findByEmail(userEmail)
                .orElseThrow(() -> new NoSuchElementException("사용자를 찾을 수 없습니다."));
        List<Favorite> favorites = favoriteRepository.findByUser(user);
        return favorites.stream()
                .map(Favorite::getMovieId)
                .collect(Collectors.toList());
    }

    // [추가] 현재 사용자가 찜한 모든 영화의 상세 정보 조회
    @Transactional(readOnly = true)
    public List<MovieDoc> getFavoriteMovieDetailsForCurrentUser() {
        User user = getCurrentUser();
        List<Favorite> favorites = favoriteRepository.findByUser(user);
        List<String> movieIds = favorites.stream()
                .map(Favorite::getMovieId)
                .collect(Collectors.toList());

        if (movieIds.isEmpty()) {
            return List.of();
        }

        List<Movie> movies = movieSearchService.getMoviesByIds(movieIds);
        return movies.stream()
                .map(movie -> {
                    MovieDoc doc = new MovieDoc();
                    doc.setMovieId(movie.getId());
                    doc.setTitle(movie.getTitle());
                    doc.setPosterUrl(movie.getPosterPath() != null ? "https://image.tmdb.org/t/p/w500" + movie.getPosterPath() : null);
                    return doc;
                }).collect(Collectors.toList());
    }
}
