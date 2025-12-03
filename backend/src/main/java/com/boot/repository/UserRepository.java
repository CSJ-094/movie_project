package com.boot.repository;

import com.boot.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // 이메일로 사용자를 찾는 메서드 (로그인 및 중복 체크에 사용)
    Optional<User> findByEmail(String email);
}
