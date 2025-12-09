package com.boot.repository;

import com.boot.entity.QuickMatchSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface QuickMatchSessionRepository extends JpaRepository<QuickMatchSession, String> {

    Optional<QuickMatchSession> findFirstByUserIdAndStatus(
            Long userId,
            QuickMatchSession.SessionStatus status
    );
}
