package com.boot.repository;

import com.boot.entity.Rating;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RatingRepository extends JpaRepository<Rating, Long> {
    Optional<Rating> findByUserIdAndMovieId(Long userId, String movieId); // Long -> String
    List<Rating> findByUserId(Long userId);
}
