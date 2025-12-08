package com.boot.repository;

import com.boot.entity.Rating;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RatingRepository extends JpaRepository<Rating, Long> {
    Optional<Rating> findByUserAndMovieId(com.boot.entity.User user, Long movieId);

    List<Rating> findByUser(com.boot.entity.User user);
}
