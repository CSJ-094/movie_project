package com.boot.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "rating",
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"user_id", "movie_id"})
       })
@EntityListeners(AuditingEntityListener.class) // JPA Auditing 활성화
public class Rating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "movie_id", nullable = false)
    private String movieId; // Long -> String

    @Column(name = "rating", nullable = false)
    private double rating; // 0.5 ~ 5.0

    @CreatedDate // 엔티티 생성 시 자동으로 시간 기록
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public Rating(User user, String movieId, double rating) { // Long -> String
        this.user = user;
        this.movieId = movieId;
        this.rating = rating;
    }
}
