package com.boot.service;

import com.boot.dto.QrSessionDto;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class QrLoginService {

    // 세션 정보를 메모리에 저장 (실제 프로덕션에서는 Redis 등을 사용하는 것이 좋습니다)
    private final Map<String, QrSessionDto> qrSessions = new ConcurrentHashMap<>();

    /**
     * 새로운 QR 로그인 세션을 생성합니다.
     * @return 생성된 세션 정보
     */
    public QrSessionDto createSession() {
        String sessionId = UUID.randomUUID().toString();
        QrSessionDto session = new QrSessionDto(sessionId, "PENDING", null);
        qrSessions.put(sessionId, session);
        return session;
    }

    /**
     * 세션의 현재 상태를 조회합니다.
     * @param sessionId 세션 ID
     * @return 세션 정보
     */
    public QrSessionDto getSessionStatus(String sessionId) {
        return qrSessions.get(sessionId);
    }

    /**
     * 모바일에서 QR 코드를 스캔했을 때 호출됩니다.
     * (시뮬레이션: 실제로는 모바일 앱에서 인증된 사용자 정보를 받아 처리해야 합니다)
     * @param sessionId 스캔된 세션 ID
     * @param userToken 사용자의 JWT 토큰
     * @return 처리 결과
     */
    public boolean scanSession(String sessionId, String userToken) {
        QrSessionDto session = qrSessions.get(sessionId);
        if (session != null && "PENDING".equals(session.getStatus())) {
            session.setStatus("SCANNED");
            // 실제 앱에서는 토큰 유효성 검증 후 사용자 정보를 연결해야 합니다.
            // 여기서는 시뮬레이션을 위해 바로 토큰을 저장하고 상태를 변경합니다.
            session.setUserToken(userToken);
            session.setStatus("COMPLETED");
            qrSessions.put(sessionId, session);
            return true;
        }
        return false;
    }
}
