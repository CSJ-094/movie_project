package com.boot.repository;

import com.boot.entity.User;
import com.boot.entity.Watchlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WatchlistRepository extends JpaRepository<Watchlist, Long> {
    // 특정 사용자와 영화 ID로 Watchlist 항목 조회
    Optional<Watchlist> findByUserAndMovieId(User user, String movieId);

    // 특정 사용자의 모든 Watchlist 항목 조회
    List<Watchlist> findByUser(User user);

    // 특정 영화 ID로 Watchlist 항목이 존재하는지 확인 (여러 사용자가 찜했을 수 있음)
    boolean existsByMovieId(String movieId);

    // 특정 사용자의 Watchlist에서 특정 영화 ID에 해당하는 항목 삭제
    void deleteByUserAndMovieId(User user, String movieId);
}
