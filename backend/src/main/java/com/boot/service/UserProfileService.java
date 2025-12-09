package com.boot.service;

import com.boot.dto.ReviewResponseDto;
import com.boot.dto.UserProfileDto;
import com.boot.dto.WatchlistMovieDto; // WatchlistMovieDto 임포트
import com.boot.entity.User;
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
public class UserProfileService {

    private final UserService userService;
    private final FavoriteService favoriteService;
    private final RatingService ratingService;
    private final ReviewService reviewService;
    private final WatchlistService watchlistService;

    @Transactional(readOnly = true)
    public UserProfileDto getUserProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new IllegalStateException("로그인된 사용자 정보를 찾을 수 없습니다.");
        }
        String userEmail = authentication.getName();
        User currentUser = userService.findByEmail(userEmail)
                .orElseThrow(() -> new NoSuchElementException("사용자를 찾을 수 없습니다: " + userEmail));

        UserProfileDto profileDto = UserProfileDto.fromUser(currentUser);

        // favoriteService.getFavoriteMovieIds()가 이제 List<String>을 반환하므로 map(Object::toString) 제거
        profileDto.setFavoriteMovieIds(favoriteService.getFavoriteMovieIds(currentUser.getEmail()));

        profileDto.setRatedMovies(ratingService.getUserRatings(currentUser.getEmail()));

        profileDto.setReviews(reviewService.findByUser(currentUser).stream()
                .map(ReviewResponseDto::fromEntity)
                .collect(Collectors.toList()));

        // Watchlist 영화 ID 목록 대신 WatchlistMovieDto 목록 사용
        profileDto.setWatchlistMovies(watchlistService.getWatchlistMovies());

        return profileDto;
    }
}
