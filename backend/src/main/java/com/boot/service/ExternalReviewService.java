package com.boot.service;

import com.boot.dto.MovieReviewDto;
import com.boot.dto.TmdbReviewResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalReviewService {

    @Value("${spring.tmdb.api-key}")
    private String apiKey;

    @Value("${spring.tmdb.base-url}")
    private String baseUrl;   // application.yml: https://api.themoviedb.org/3

    private final ObjectMapper objectMapper;

    // 디버깅 편하게 RestTemplate 사용
    private final RestTemplate restTemplate = new RestTemplate();

    private final ReviewTranslationService reviewTranslationService;

    public List<MovieReviewDto> getTmdbReviews(String tmdbMovieId) {

        // 1차: 한국어 리뷰
        List<MovieReviewDto> ko = fetchReviews(tmdbMovieId, "ko-KR");
        if (!ko.isEmpty()) {
            return ko;
        }

        // 2차: 영어 리뷰
        List<MovieReviewDto> en = fetchReviews(tmdbMovieId, "en-US");
        return en;
    }

    private List<MovieReviewDto> fetchReviews(String tmdbMovieId, String language) {

        String url = String.format(
                "%s/movie/%s/reviews?api_key=%s&language=%s",
                baseUrl, tmdbMovieId, apiKey, language
        );

        try {
            // 1) TMDB 응답 원문 찍기
            ResponseEntity<String> resp = restTemplate.getForEntity(url, String.class);
            log.info("[TMDB] reviews request url={}, status={}, body={}",
                    url, resp.getStatusCode(), resp.getBody());

            if (!resp.getStatusCode().is2xxSuccessful()) {
                // 401, 404 같은 거면 그냥 빈 리스트 리턴
                return Collections.emptyList();
            }

            // 2) JSON 파싱
            TmdbReviewResponse response =
                    objectMapper.readValue(resp.getBody(), TmdbReviewResponse.class);

            if (response.getResults() == null || response.getResults().isEmpty()) {
                return Collections.emptyList();
            }

            return response.getResults().stream()
                    .map(r -> {
                        String original = r.getContent();

                        // 한국어 리뷰면 그대로, 영어(en-US) 등이면 번역 시도
                        String translated = null;
                        if ("ko-KR".equals(language)) {
                            translated = original; // 이미 한국어라 그대로
                        } else {
                            translated = reviewTranslationService.translateToKorean(original);
                        }

                        return MovieReviewDto.builder()
                                .source("TMDB-" + language)
                                .author(r.getAuthor())
                                .content(original)              // 원문
                                .translated(translated)         // 한국어 번역본 (없으면 null)
                                .rating(
                                        r.getAuthor_details() != null
                                                ? r.getAuthor_details().getRating()
                                                : null
                                )
                                .createdAt(r.getCreated_at())
                                .build();
                    })
                    .toList();

        } catch (Exception e) {
            log.warn("[TMDB] 리뷰 조회 중 오류 url={} language={} : {}", url, language, e.getMessage());
            return Collections.emptyList();
        }
    }
}
