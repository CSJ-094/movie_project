package com.boot.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "tmdb_reviews",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_tmdb_movie_review",
                        columnNames = {"movie_id", "external_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TmdbReviewEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "movie_id", nullable = false)
    private String movieId;          // TMDB 영화 ID (네가 이미 String으로 쓰고 있으니까)

    @Column(name = "external_id", nullable = false, length = 100)
    private String externalId;       // TMDB 리뷰 ID

    @Column(name = "author")
    private String author;

    @Column(name = "original_lang", length = 10)
    private String originalLang;     // "en", "ko" 등

    @Column(name = "original_content", nullable = false, length = 5000)
    private String originalContent;

    @Column(name = "translated_content", length = 5000)
    private String translatedContent; // 한국어 번역본

    @Column(name = "rating")
    private Double rating;           // TMDB 리뷰 평점(있으면)

    @Column(name = "created_at_tmdb")
    private String createdAtTmdb;    // TMDB created_at 그대로 문자열로 저장해도 됨

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt; // 우리 시스템에 저장된 시각

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
