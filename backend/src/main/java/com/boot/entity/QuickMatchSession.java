package com.boot.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "quick_match_session")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuickMatchSession {

    @Id
    private String id;      // UUID 문자열 그대로 저장

    @Column(name = "user_id", nullable = false)
    private Long userId;    // users.id FK

    @Column(name = "target_count", nullable = false)
    private Integer targetCount;   // 목표 평가 개수 (예: 25)

    @Column(name = "rated_count", nullable = false)
    private Integer ratedCount;    // 지금까지 평가한 개수

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionStatus status;  // IN_PROGRESS / COMPLETED

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public enum SessionStatus {
        IN_PROGRESS, COMPLETED
    }
}
