package com.boot.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter; // Setter 추가
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter // watched 필드 수정을 위해 추가
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Table(name = "watchlist",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "watchlist_uk",
                        columnNames = {"user_id", "movie_id"}
                )
        })
public class Watchlist {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "movie_id", nullable = false)
    private String movieId;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private boolean watched; // 시청 완료 여부 필드 추가

    @Builder
    public Watchlist(User user, String movieId, boolean watched) { // watched 필드 추가
        this.user = user;
        this.movieId = movieId;
        this.watched = watched; // 초기값 설정
    }

    // 시청 완료 상태를 토글하는 메서드
    public void toggleWatched() {
        this.watched = !this.watched;
    }
}
