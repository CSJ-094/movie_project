package com.boot.repository;

import com.boot.entity.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    Optional<Favorite> findByUserAndMovieId(com.boot.entity.User user, Long movieId);

    List<Favorite> findByUser(com.boot.entity.User user);

    boolean existsByUserAndMovieId(com.boot.entity.User user, Long movieId);
}
