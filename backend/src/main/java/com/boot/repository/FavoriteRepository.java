package com.boot.repository;

import com.boot.entity.Favorite;
import com.boot.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    // userId로 찾는 메서드 (기존)
    Optional<Favorite> findByUserIdAndMovieId(Long userId, String movieId);
    List<Favorite> findByUserId(Long userId);
    boolean existsByUserIdAndMovieId(Long userId, String movieId);

    // User 객체로 찾는 메서드 (추가)
    Optional<Favorite> findByUserAndMovieId(User user, String movieId);
    List<Favorite> findByUser(User user);
    boolean existsByUserAndMovieId(User user, String movieId);
}
