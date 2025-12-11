package com.boot.repository;

import com.boot.entity.Rating;
import com.boot.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RatingRepository extends JpaRepository<Rating, Long> {
    // ReviewService에서 User 객체와 Long 타입의 movieId를 사용하므로, 그에 맞게 시그니처를 수정합니다.
    Optional<Rating> findByUserAndMovieId(User user, String movieId);
    List<Rating> findByUserId(Long userId);
    // 리뷰 삭제 시 평점도 함께 삭제하기 위한 메서드를 추가합니다.
    void deleteByUserAndMovieId(User user, String movieId);
}
