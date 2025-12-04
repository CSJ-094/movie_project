package com.boot.repository;

import com.boot.entity.Review;
import com.boot.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    // 특정 영화의 모든 리뷰 조회
    List<Review> findByMovieId(String movieId);

    // 특정 영화에 대한 특정 사용자의 리뷰 조회
    Optional<Review> findByMovieIdAndUser(String movieId, User user);

    // 특정 사용자가 작성한 모든 리뷰 조회
    List<Review> findByUser(User user);
}
