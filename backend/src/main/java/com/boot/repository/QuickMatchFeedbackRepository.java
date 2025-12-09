package com.boot.repository;

import com.boot.entity.QuickMatchFeedback;
import com.boot.entity.QuickMatchSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuickMatchFeedbackRepository extends JpaRepository<QuickMatchFeedback, Long> {

    List<QuickMatchFeedback> findBySessionId(String sessionId);

    List<QuickMatchFeedback> findBySessionIdAndAction(
            String sessionId,
            QuickMatchFeedback.Action action
    );

    boolean existsBySessionIdAndMovieId(
            String sessionId,
            String movieId
    );
}
