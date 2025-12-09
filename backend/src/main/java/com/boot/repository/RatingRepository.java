package com.boot.repository;

import com.boot.entity.Rating;
import com.boot.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RatingRepository extends JpaRepository<Rating, Long> {
    Optional<Rating> findByUserAndMovieId(User user, String movieId);
    List<Rating> findByUser(User user);
}
