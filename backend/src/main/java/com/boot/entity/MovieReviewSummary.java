package com.boot.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "movie_review_summary",
        uniqueConstraints = {@UniqueConstraint(
                name = "uk_movie_summary_movie",
                columnNames = "movie_id"
        )}
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovieReviewSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "movie_id", nullable = false)
    private String movieId;

    @Column(columnDefinition = "TEXT")
    private String goodPoints;

    @Column(columnDefinition = "TEXT")
    private String badPoints;

    @Column(columnDefinition = "TEXT")
    private String overall;

    private Double positiveRatio;
    private Double negativeRatio;
    private Double neutralRatio;

    @Column(nullable = false)
    private LocalDateTime lastUpdated;
}
