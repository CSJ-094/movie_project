package com.boot.repository;

import com.boot.entity.Favorite;
import com.boot.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    Optional<Favorite> findByUserAndMovieId(User user, String movieId);
    List<Favorite> findByUser(User user);
    boolean existsByUserAndMovieId(User user, String movieId);
}
