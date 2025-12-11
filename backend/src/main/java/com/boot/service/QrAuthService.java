package com.boot.service;

import com.boot.dto.QrSessionStatusResponse;
import com.boot.dto.QrSessionStatusResponse.QrAuthStatus;
import com.boot.jwt.JwtTokenProvider;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
public class QrAuthService {

    private static final String QR_SESSION_KEY_PREFIX = "qr:session:";
    private static final Duration QR_SESSION_TIMEOUT = Duration.ofMinutes(5); // 5분 만료

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;

    public QrAuthService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper,
                         JwtTokenProvider jwtTokenProvider, UserDetailsService userDetailsService) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userDetailsService = userDetailsService;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    private static class QrSessionState {
        private QrAuthStatus status;
        private String userId;
        private String jwtToken;
    }

    /**
     * 새로운 QR 코드 인증 세션을 생성합니다.
     * @return 생성된 세션 ID
     */
    public String generateSession() {
        String sessionId = UUID.randomUUID().toString();
        String redisKey = QR_SESSION_KEY_PREFIX + sessionId;

        QrSessionState initialState = new QrSessionState(QrAuthStatus.PENDING, null, null);
        try {
            String sessionJson = objectMapper.writeValueAsString(initialState);
            redisTemplate.opsForValue().set(redisKey, sessionJson, QR_SESSION_TIMEOUT);
            System.out.println("Generated QR session in Redis: " + sessionId);
        } catch (JsonProcessingException e) {
            System.err.println("Error serializing QR session state: " + e.getMessage());
            throw new RuntimeException("Failed to generate QR session.", e);
        }
        return sessionId;
    }

    /**
     * 모바일 앱으로부터 받은 정보로 QR 세션을 인증합니다.
     * @param sessionId QR 코드로부터 얻은 세션 ID
     * @param mobileAuthToken 모바일 앱에 로그인된 사용자의 JWT 토큰
     * @return 인증 성공 여부
     */
    public boolean authenticateSession(String sessionId, String mobileAuthToken) {
        String redisKey = QR_SESSION_KEY_PREFIX + sessionId;
        ValueOperations<String, String> ops = redisTemplate.opsForValue();
        String sessionJson = ops.get(redisKey);

        if (sessionJson == null) {
            System.out.println("Session " + sessionId + " not found or expired in Redis.");
            return false;
        }

        QrSessionState sessionState; // try 블록 외부에서 선언

        try {
            sessionState = objectMapper.readValue(sessionJson, QrSessionState.class);
        } catch (JsonProcessingException e) {
            System.err.println("Error deserializing QR session state for " + sessionId + ": " + e.getMessage());
            throw new RuntimeException("Failed to read QR session state from Redis.", e);
        }

        try {
            if (sessionState.getStatus() != QrAuthStatus.PENDING) {
                System.out.println("Session " + sessionId + " is not in PENDING state. Current: " + sessionState.getStatus());
                return false;
            }

            // 1. mobileAuthToken 유효성 검증 및 사용자 정보 추출
            if (!jwtTokenProvider.validateToken(mobileAuthToken)) {
                sessionState.setStatus(QrAuthStatus.FAILED);
                ops.set(redisKey, objectMapper.writeValueAsString(sessionState), QR_SESSION_TIMEOUT);
                System.out.println("Session " + sessionId + " authentication failed: Invalid mobileAuthToken.");
                return false;
            }

            // 토큰에서 사용자 이름 (이메일) 추출
            String username = jwtTokenProvider.getUserPk(mobileAuthToken);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            String userRole = userDetails.getAuthorities().stream()
                            .findFirst()
                            .map(grantedAuthority -> grantedAuthority.getAuthority())
                            .orElse("ROLE_USER");

            // 2. 웹 페이지용 새로운 JWT 토큰 생성
            String webJwtToken = jwtTokenProvider.createToken(username, userRole);

            sessionState.setStatus(QrAuthStatus.AUTHENTICATED);
            sessionState.setUserId(username);
            sessionState.setJwtToken(webJwtToken); // 웹 페이지용 토큰 저장

            // Redis에 업데이트된 세션 상태 저장 (TTL 유지)
            ops.set(redisKey, objectMapper.writeValueAsString(sessionState), QR_SESSION_TIMEOUT);
            System.out.println("Session " + sessionId + " authenticated by user: " + username + " with mobile token in Redis.");
            return true;

        } catch (JsonProcessingException e) {
            System.err.println("Error serializing QR session state for " + sessionId + ": " + e.getMessage());
            throw new RuntimeException("Failed to update QR session state in Redis.", e);
        } catch (Exception e) { // UserDetailsService.loadUserByUsername 등에서 발생할 수 있는 예외 처리
            // 이 catch 블록은 sessionState가 이미 초기화된 상태에서 발생한 예외를 처리합니다.
            // 따라서 sessionState는 항상 null이 아닙니다.
            sessionState.setStatus(QrAuthStatus.FAILED);
            try {
                ops.set(redisKey, objectMapper.writeValueAsString(sessionState), QR_SESSION_TIMEOUT);
            } catch (JsonProcessingException ex) {
                System.err.println("Error serializing FAILED state: " + ex.getMessage());
            }
            System.out.println("Session " + sessionId + " authentication failed due to internal error: " + e.getMessage());
            return false;
        }
    }

    /**
     * 특정 세션 ID의 현재 인증 상태를 조회합니다.
     * @param sessionId 조회할 세션 ID
     * @return 세션 상태 응답 DTO
     */
    public QrSessionStatusResponse getSessionStatus(String sessionId) {
        String redisKey = QR_SESSION_KEY_PREFIX + sessionId;
        String sessionJson = redisTemplate.opsForValue().get(redisKey);

        if (sessionJson == null) {
            return new QrSessionStatusResponse(sessionId, QrAuthStatus.EXPIRED, null, "Session not found or expired.");
        }

        try {
            QrSessionState sessionState = objectMapper.readValue(sessionJson, QrSessionState.class);
            String token = (sessionState.getStatus() == QrAuthStatus.AUTHENTICATED) ? sessionState.getJwtToken() : null;
            return new QrSessionStatusResponse(sessionId, sessionState.getStatus(), token, "Current status: " + sessionState.getStatus().name());
        } catch (JsonProcessingException e) {
            System.err.println("Error deserializing QR session state for " + sessionId + ": " + e.getMessage());
            throw new RuntimeException("Failed to get QR session status.", e);
        }
    }
}
