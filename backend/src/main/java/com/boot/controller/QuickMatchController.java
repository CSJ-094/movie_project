package com.boot.controller;

import com.boot.dto.*;
import com.boot.entity.QuickMatchFeedback;
import com.boot.entity.QuickMatchSession;
import com.boot.service.QuickMatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/quickmatch")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class QuickMatchController {

    private final QuickMatchService quickMatchService;

    // TODO: 실제로는 SecurityContext에서 userId 꺼내야 함.
    // 지금은 테스트용으로 하드코딩. 나중에 JWT 붙여서 바꾸면 됨.
    private Long getCurrentUserId() {
        return 1L;
    }

    /**
     * 세션 생성
     * POST /api/quickmatch/session
     */
    @PostMapping("/session")
    public QuickMatchSessionResponse createSession(
            @RequestBody(required = false) CreateQuickMatchSessionRequest request
    ) {
        Long userId = getCurrentUserId();

        Integer targetCount = (request != null) ? request.getTargetCount() : null;

        QuickMatchSession session = quickMatchService.createSession(userId, targetCount);

        return new QuickMatchSessionResponse(
                session.getId(),
                session.getTargetCount()
        );
    }

    /**
     * 다음 영화 가져오기
     * GET /api/quickmatch/next?sessionId=...
     */
    @GetMapping("/next")
    public NextMovieResponse getNext(@RequestParam String sessionId) {

        QuickMatchSession session = quickMatchService.getSession(sessionId);
        MovieDoc movieDoc = quickMatchService.getNextMovie(sessionId);

        QuickMatchMovieDto movieDto = QuickMatchMovieDto.from(movieDoc);

        ProgressDto progress = new ProgressDto(
                session.getRatedCount(),
                session.getTargetCount()
        );

        return new NextMovieResponse(
                sessionId,
                movieDto,
                progress
        );
    }

    /**
     * 피드백 저장 (LIKE / DISLIKE)
     * POST /api/quickmatch/feedback
     */
    @PostMapping("/feedback")
    public QuickMatchFeedbackResponse feedback(
            @RequestBody QuickMatchFeedbackRequest request
    ) {
        Long userId = getCurrentUserId();

        QuickMatchSession session = quickMatchService.saveFeedback(
                request.getSessionId(),
                userId,
                request.getMovieId(),
                QuickMatchFeedback.Action.valueOf(request.getAction())
        );

        return new QuickMatchFeedbackResponse(
                session.getId(),
                session.getRatedCount(),
                session.getTargetCount()
        );
    }

    /**
     * 퀵매칭 결과 조회
     * GET /api/quickmatch/result?sessionId=...
     */
    @GetMapping("/result")
    public QuickMatchResultResponse getResult(@RequestParam String sessionId) {
        return quickMatchService.getResult(sessionId);
    }

}
