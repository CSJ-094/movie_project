package com.boot.repository;


import com.boot.entity.MovieReviewSummary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MovieReviewSummaryRepository extends JpaRepository<MovieReviewSummary, Long> {

    Optional<MovieReviewSummary> findByMovieId(String movieId);
}
