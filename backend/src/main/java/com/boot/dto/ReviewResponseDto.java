package com.boot.dto;

import com.boot.entity.Review;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ReviewResponseDto {
    private Long id;
    private String movieId;
    private Long userId;
    private String userName; // 리뷰 작성자 이름 (User 엔티티의 name 필드 사용)
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ReviewResponseDto fromEntity(Review review) {
        return ReviewResponseDto.builder()
                .id(review.getId())
                .movieId(review.getMovieId())
                .userId(review.getUser().getId())
                .userName(review.getUser().getName()) // User 엔티티의 getName() 메서드 사용
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}
