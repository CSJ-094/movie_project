package com.boot.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "users")
public class User {

    @jakarta.persistence.Id // Use the correct Id annotation for JPA
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false)
    private Long id;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "role", nullable = false)
    private String role;

    @Column(name = "enabled", nullable = false)
    private boolean enabled = false;

    @Builder
    public User(String email, String password, String name, String role) {
        this.email = email;
        this.password = password;
        this.name = name;
        this.role = role;
        this.enabled = false;
    }

    // 사용자 정보 수정 (필요 시)
    public void update(String password) {
        this.password = password;
    }

    // 이메일 인증 관련
    public void enable() {
        this.enabled = true;
    }
}