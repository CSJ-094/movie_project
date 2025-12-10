package com.boot.service;

import com.boot.entity.TmdbReviewEntity;
import com.boot.repository.TmdbReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TmdbReviewTranslateScheduler {

    private final TmdbReviewRepository tmdbReviewRepository;
    private final ReviewTranslationService reviewTranslationService;

    /**
     * 30초마다 번역 안 된 TMDB 리뷰 최대 100개씩 번역
     */
    @Scheduled(fixedDelay = 30000)
    public void translatePendingReviews() {
        List<TmdbReviewEntity> pending =
                tmdbReviewRepository.findTop100ByTranslatedContentIsNullOrderByCreatedAtAsc();

        if (pending.isEmpty()) {
            return;
        }

        log.info("번역 대기 TMDB 리뷰 {}건 처리 시작", pending.size());

        for (TmdbReviewEntity e : pending) {
            String translated = reviewTranslationService.translateToKorean(e.getOriginalContent());
            if (translated == null) {
                log.warn("번역 실패: reviewId={}, movieId={}", e.getId(), e.getMovieId());
                continue;
            }

            e.setTranslatedContent(translated);
            e.setUpdatedAt(LocalDateTime.now());
            tmdbReviewRepository.save(e);
        }

        log.info("번역 처리 완료");
    }
}
