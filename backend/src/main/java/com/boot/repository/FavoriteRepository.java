package com.boot.repository;

import com.boot.entity.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    Optional<Favorite> findByUserIdAndMovieId(Long userId, String movieId); // Long -> String
    List<Favorite> findByUserId(Long userId);
    boolean existsByUserIdAndMovieId(Long userId, String movieId); // Long -> String
}
