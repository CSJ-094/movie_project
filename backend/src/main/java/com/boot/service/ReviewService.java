package com.boot.service;

import com.boot.entity.Review;
import com.boot.entity.User;
import com.boot.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserService userService; // User 정보를 가져오기 위해 주입

    // UserService getter (ReviewController에서 사용)
    public UserService getUserService() {
        return userService;
    }

    // 현재 로그인한 사용자 정보 가져오기
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new IllegalStateException("로그인된 사용자 정보를 찾을 수 없습니다.");
        }
        String userEmail = authentication.getName();
        return userService.findByEmail(userEmail) // UserService에 findByEmail 메서드가 있다고 가정
                .orElseThrow(() -> new NoSuchElementException("사용자를 찾을 수 없습니다: " + userEmail));
    }

    // 리뷰 생성
    @Transactional
    public Review createReview(String movieId, Integer rating, String comment) {
        User currentUser = getCurrentUser();
        
        // 이미 리뷰를 작성했는지 확인
        Optional<Review> existingReview = reviewRepository.findByMovieIdAndUser(movieId, currentUser);
        if (existingReview.isPresent()) {
            throw new IllegalStateException("이미 해당 영화에 대한 리뷰를 작성했습니다. 기존 리뷰를 수정해주세요.");
        }

        Review review = Review.builder()
                .movieId(movieId)
                .user(currentUser)
                .rating(rating)
                .comment(comment)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        return reviewRepository.save(review);
    }

    // 특정 영화의 모든 리뷰 조회
    @Transactional(readOnly = true)
    public List<Review> getReviewsByMovieId(String movieId) {
        return reviewRepository.findByMovieId(movieId);
    }

    // 단일 리뷰 조회
    @Transactional(readOnly = true)
    public Optional<Review> getReviewById(Long reviewId) {
        return reviewRepository.findById(reviewId);
    }

    // 리뷰 수정
    @Transactional
    public Review updateReview(Long reviewId, Integer newRating, String newComment) {
        User currentUser = getCurrentUser();
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new NoSuchElementException("리뷰를 찾을 수 없습니다: " + reviewId));

        if (!review.getUser().getId().equals(currentUser.getId())) {
            throw new SecurityException("리뷰를 수정할 권한이 없습니다.");
        }

        review.setRating(newRating);
        review.setComment(newComment);
        review.setUpdatedAt(LocalDateTime.now());
        return reviewRepository.save(review);
    }

    // 리뷰 삭제
    @Transactional
    public void deleteReview(Long reviewId) {
        User currentUser = getCurrentUser();
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new NoSuchElementException("리뷰를 찾을 수 없습니다: " + reviewId));

        if (!review.getUser().getId().equals(currentUser.getId())) {
            throw new SecurityException("리뷰를 삭제할 권한이 없습니다.");
        }
        reviewRepository.delete(review);
    }

    // 특정 영화에 대한 특정 사용자의 리뷰 조회
    @Transactional(readOnly = true)
    public Optional<Review> getUserReviewForMovie(String movieId, Long userId) {
        User user = userService.findById(userId) // UserService에 findById 메서드가 있다고 가정
                .orElseThrow(() -> new NoSuchElementException("사용자를 찾을 수 없습니다: " + userId));
        return reviewRepository.findByMovieIdAndUser(movieId, user);
    }
}
