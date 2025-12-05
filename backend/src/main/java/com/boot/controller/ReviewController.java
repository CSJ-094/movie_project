package com.boot.controller;

import com.boot.dto.ReviewRequestDto;
import com.boot.dto.ReviewResponseDto;
import com.boot.entity.Review;
import com.boot.service.ReviewService;
import com.boot.entity.User; // User import 추가
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder; // SecurityContextHolder import 추가
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional; // Optional import 추가
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @Operation(summary = "새 리뷰 작성", description = "영화에 대한 새로운 리뷰를 작성합니다.")
    @PostMapping
    public ResponseEntity<ReviewResponseDto> createReview(@RequestBody ReviewRequestDto requestDto) {
        try {
            Review review = reviewService.createReview(requestDto.getMovieId(), requestDto.getRating(), requestDto.getComment());
            return ResponseEntity.status(HttpStatus.CREATED).body(ReviewResponseDto.fromEntity(review));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build(); // 이미 리뷰 작성 시 409 Conflict
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build(); // 사용자 또는 영화를 찾을 수 없을 때 404 Not Found
        }
    }

    @Operation(summary = "특정 영화의 모든 리뷰 조회", description = "특정 영화 ID에 해당하는 모든 리뷰를 조회합니다.")
    @GetMapping("/movie/{movieId}")
    public ResponseEntity<List<ReviewResponseDto>> getReviewsByMovieId(@PathVariable String movieId) {
        List<Review> reviews = reviewService.getReviewsByMovieId(movieId);
        List<ReviewResponseDto> responseDtos = reviews.stream()
                .map(ReviewResponseDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responseDtos);
    }

    @Operation(summary = "리뷰 수정", description = "기존 리뷰를 수정합니다.")
    @PutMapping("/{reviewId}")
    public ResponseEntity<ReviewResponseDto> updateReview(@PathVariable Long reviewId, @RequestBody ReviewRequestDto requestDto) {
        try {
            Review updatedReview = reviewService.updateReview(reviewId, requestDto.getRating(), requestDto.getComment());
            return ResponseEntity.ok(ReviewResponseDto.fromEntity(updatedReview));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build(); // 리뷰를 찾을 수 없을 때 404 Not Found
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build(); // 권한이 없을 때 403 Forbidden
        }
    }

    @Operation(summary = "리뷰 삭제", description = "기존 리뷰를 삭제합니다.")
    @DeleteMapping("/{reviewId}")
    public ResponseEntity<Void> deleteReview(@PathVariable Long reviewId) {
        try {
            reviewService.deleteReview(reviewId);
            return ResponseEntity.noContent().build(); // 성공적으로 삭제 시 204 No Content
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build(); // 리뷰를 찾을 수 없을 때 404 Not Found
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build(); // 권한이 없을 때 403 Forbidden
        }
    }

    @Operation(summary = "특정 영화에 대한 현재 사용자의 리뷰 조회", description = "현재 로그인한 사용자가 특정 영화에 작성한 리뷰를 조회합니다.")
    @GetMapping("/movie/{movieId}/my-review")
    public ResponseEntity<ReviewResponseDto> getMyReviewForMovie(@PathVariable String movieId) {
        try {
            String userEmail = SecurityContextHolder.getContext().getAuthentication().getName();
            User currentUser = reviewService.getUserService().findByEmail(userEmail)
                    .orElseThrow(() -> new NoSuchElementException("로그인된 사용자를 찾을 수 없습니다."));

            Optional<Review> review = reviewService.getUserReviewForMovie(movieId, currentUser.getId());

            return review.map(ReviewResponseDto::fromEntity)
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
}
