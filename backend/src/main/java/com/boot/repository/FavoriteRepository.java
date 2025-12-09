package com.boot.repository;

import com.boot.entity.Favorite;
import com.boot.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    Optional<Favorite> findByUserIdAndMovieId(User user, String movieId); // Long -> String
    List<Favorite> findByUserId(Long userId);
    boolean existsByUserIdAndMovieId(User user, String movieId); // Long -> String
}
