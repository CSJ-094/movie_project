package com.boot.dto;

import com.boot.entity.User;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
public class UserProfileDto {
    private Long id;
    private String email;
    private String name;
    private String role;

    private List<String> favoriteMovieIds; // 찜한 영화 ID 목록
    private Map<String, Integer> ratedMovies; // 평점 매긴 영화 (movieId -> rating)
    private List<ReviewResponseDto> reviews; // 작성한 리뷰 목록
    private List<WatchlistMovieDto> watchlistMovies; // Watchlist 영화 목록 (ID와 watched 상태 포함)

    public static UserProfileDto fromUser(User user) {
        return UserProfileDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole())
                .build();
    }
}
