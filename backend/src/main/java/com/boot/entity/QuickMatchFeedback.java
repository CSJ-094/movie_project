package com.boot.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "quick_match_feedback")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuickMatchFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private String sessionId;   // quick_match_session.id

    @Column(name = "user_id", nullable = false)
    private Long userId;        // User.id

    @Column(name = "movie_id", nullable = false)
    private String movieId;       // 영화 ID

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Action action;      // LIKE / DISLIKE

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public enum Action {
        LIKE,
        DISLIKE
    }
}
