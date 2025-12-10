package com.boot.service;

import com.boot.dto.MovieReviewDto;
import com.boot.dto.TmdbReviewResponse;
import com.boot.entity.TmdbReviewEntity;
import com.boot.repository.TmdbReviewRepository;
import com.boot.config.TmdbProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalReviewService {

    private final TmdbProperties tmdbProperties;
    private final TmdbReviewRepository tmdbReviewRepository;
    private final ReviewTranslationService reviewTranslationService;

    private final RestClient tmdbClient = RestClient.builder().build();

    public List<MovieReviewDto> getTmdbReviews(String movieId) {
        // 1) TMDB에서 최신 리뷰 불러와서 DB와 동기화
        syncTmdbReviews(movieId);

        // 2) DB에서 가져와서 DTO로 변환 (번역되었으면 translated 필드 채워주기)
        List<TmdbReviewEntity> entities =
                tmdbReviewRepository.findByMovieIdOrderByCreatedAtTmdbDesc(movieId);

        List<MovieReviewDto> dtos = new ArrayList<>();
        for (TmdbReviewEntity e : entities) {

            // ★ 여기서 즉석 번역 + 저장 ★
            String translatedText = e.getTranslatedContent();
            if (translatedText == null || translatedText.isBlank()) {
                translatedText = reviewTranslationService.translateToKorean(e.getOriginalContent());
                if (translatedText != null && !translatedText.isBlank()) {
                    e.setTranslatedContent(translatedText);
                    e.setUpdatedAt(LocalDateTime.now());
                    tmdbReviewRepository.save(e);
                    log.info("TMDB 리뷰 즉석 번역 완료. movieId={}, reviewId={}", e.getMovieId(), e.getId());
                }
            }

            // 프론트 규약: content = 영어 원문, translated = 한국어
            MovieReviewDto dto = MovieReviewDto.builder()
                    .source("TMDB")
                    .author(e.getAuthor())
                    .content(e.getOriginalContent())
                    .translated(translatedText)  // 여기로 전달
                    .rating(e.getRating())
                    .createdAt(e.getCreatedAtTmdb())
                    .build();

            dtos.add(dto);
        }

        return dtos;
    }

    private void syncTmdbReviews(String movieId) {
        String url = tmdbProperties.getBaseUrl()
                + "/movie/" + movieId + "/reviews?api_key=" + tmdbProperties.getApiKey()
                + "&language=en-US&page=1";

        TmdbReviewResponse response = tmdbClient.get()
                .uri(url)
                .retrieve()
                .body(TmdbReviewResponse.class);

        if (response == null || response.getResults() == null) {
            return;
        }

        for (TmdbReviewResponse.TmdbReview r : response.getResults()) {
            tmdbReviewRepository.findByMovieIdAndExternalId(movieId, r.getId())
                    .ifPresentOrElse(
                            // 이미 있으면 필요 시 업데이트
                            existing -> {
                                boolean changed = false;
                                if (!existing.getOriginalContent().equals(r.getContent())) {
                                    existing.setOriginalContent(r.getContent());
                                    changed = true;
                                }
                                if (changed) {
                                    existing.setUpdatedAt(LocalDateTime.now());
                                    tmdbReviewRepository.save(existing);
                                }
                            },
                            // 없으면 새로 저장
                            () -> {
                                TmdbReviewEntity entity = TmdbReviewEntity.builder()
                                        .movieId(movieId)
                                        .externalId(r.getId())
                                        .author(r.getAuthor())
                                        .originalLang("en") // TMDB 리뷰는 대부분 en
                                        .originalContent(r.getContent())
                                        .rating(r.getAuthor_details() != null
                                                ? r.getAuthor_details().getRating()
                                                : null)
                                        .createdAtTmdb(r.getCreated_at())
                                        .createdAt(LocalDateTime.now())
                                        .updatedAt(LocalDateTime.now())
                                        .build();
                                try {
                                    tmdbReviewRepository.save(entity);
                                } catch (org.springframework.dao.DataIntegrityViolationException ex) {
                                    // ★ 동시성으로 인한 중복 insert는 그냥 무시
                                    // (이미 다른 요청이 같은 row를 넣은 상황)
                                    log.warn("중복 TMDB 리뷰 무시: movieId={}, externalId={}",
                                            movieId, r.getId());
                                }
                            }
                    );
        }
    }
}
