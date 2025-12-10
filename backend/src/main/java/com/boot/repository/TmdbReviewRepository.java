package com.boot.repository;

import com.boot.entity.TmdbReviewEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TmdbReviewRepository extends JpaRepository<TmdbReviewEntity, Long> {

    List<TmdbReviewEntity> findByMovieIdOrderByCreatedAtTmdbDesc(String movieId);

    Optional<TmdbReviewEntity> findByMovieIdAndExternalId(String movieId, String externalId);

    // 번역 안 된 리뷰 N개씩 가져오기(스케줄러용)
    List<TmdbReviewEntity> findTop100ByTranslatedContentIsNullOrderByCreatedAtAsc();
}
