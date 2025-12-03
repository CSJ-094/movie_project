package com.boot.service;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import com.boot.entity.User;

@Entity
@Getter
@NoArgsConstructor
public class PasswordResetToken {

    private static final int EXPIRATION_MINUTES = 10; // 토큰 만료 시간 (10분)

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false, name = "user_id")
    private User user;

    @Column(nullable = false)
    private LocalDateTime expiryDate;

    public PasswordResetToken(String token, User user) {
        this.token = token;
        this.user = user;
        this.expiryDate = calculateExpiryDate();
    }

    private LocalDateTime calculateExpiryDate() {
        return LocalDateTime.now().plusMinutes(EXPIRATION_MINUTES);
    }
}