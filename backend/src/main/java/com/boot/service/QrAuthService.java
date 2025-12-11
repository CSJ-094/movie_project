package com.boot.service;

import com.boot.dto.QrSessionStatusResponse;
import com.boot.dto.QrSessionStatusResponse.QrAuthStatus;
import com.boot.dto.TokenInfo;
import com.boot.jwt.JwtTokenProvider;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

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
    private final UserService userService; // UserService 주입

    public QrAuthService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper,
                         JwtTokenProvider jwtTokenProvider, UserDetailsService userDetailsService,
                         UserService userService) { // 생성자에 UserService 추가
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userDetailsService = userDetailsService;
        this.userService = userService;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    private static class QrSessionState {
        private QrAuthStatus status;
        private String userId;
        private String jwtToken;
    }

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

    public boolean authenticateSession(String sessionId, String mobileAuthToken, String username, String password) {
        String redisKey = QR_SESSION_KEY_PREFIX + sessionId;
        ValueOperations<String, String> ops = redisTemplate.opsForValue();
        String sessionJson = ops.get(redisKey);

        if (sessionJson == null) {
            System.out.println("Session " + sessionId + " not found or expired in Redis.");
            return false;
        }

        try {
            QrSessionState sessionState = objectMapper.readValue(sessionJson, QrSessionState.class);

            if (sessionState.getStatus() != QrAuthStatus.PENDING) {
                System.out.println("Session " + sessionId + " is not in PENDING state. Current: " + sessionState.getStatus());
                return false;
            }

            String userIdentifier;
            String webJwtToken;

            // 1. 인증 방식 결정: mobileAuthToken 우선, 없으면 username/password 사용
            if (StringUtils.hasText(mobileAuthToken)) {
                // 기존 로직: 모바일 토큰으로 인증
                if (!jwtTokenProvider.validateToken(mobileAuthToken)) {
                    updateSessionStatus(redisKey, sessionState, QrAuthStatus.FAILED, null, null);
                    System.out.println("Session " + sessionId + " authentication failed: Invalid mobileAuthToken.");
                    return false;
                }
                userIdentifier = jwtTokenProvider.getUserPk(mobileAuthToken);
                UserDetails userDetails = userDetailsService.loadUserByUsername(userIdentifier);
                String userRole = userDetails.getAuthorities().stream()
                                .findFirst()
                                .map(grantedAuthority -> grantedAuthority.getAuthority())
                                .orElse("ROLE_USER");
                webJwtToken = jwtTokenProvider.createToken(userIdentifier, userRole);

            } else if (StringUtils.hasText(username) && StringUtils.hasText(password)) {
                // 새로운 로직: username/password로 인증
                try {
                    TokenInfo tokenInfo = userService.login(username, password);
                    userIdentifier = username;
                    webJwtToken = tokenInfo.getAccessToken(); // 로그인 성공 후 발급된 토큰 사용
                } catch (AuthenticationException | IllegalArgumentException e) {
                    updateSessionStatus(redisKey, sessionState, QrAuthStatus.FAILED, null, null);
                    System.out.println("Session " + sessionId + " authentication failed for user " + username + ": " + e.getMessage());
                    return false;
                }
            } else {
                // 인증 정보가 전혀 없는 경우
                updateSessionStatus(redisKey, sessionState, QrAuthStatus.FAILED, null, null);
                System.out.println("Session " + sessionId + " authentication failed: No credentials provided.");
                return false;
            }

            // 2. 인증 성공 후 세션 상태 업데이트
            updateSessionStatus(redisKey, sessionState, QrAuthStatus.AUTHENTICATED, userIdentifier, webJwtToken);
            System.out.println("Session " + sessionId + " authenticated by user: " + userIdentifier + " in Redis.");
            return true;

        } catch (JsonProcessingException e) {
            System.err.println("Error processing QR session state for " + sessionId + ": " + e.getMessage());
            throw new RuntimeException("Failed to process QR session state.", e);
        } catch (Exception e) {
            // 예상치 못한 오류 발생 시 FAILED 처리
            try {
                QrSessionState sessionState = objectMapper.readValue(ops.get(redisKey), QrSessionState.class);
                updateSessionStatus(redisKey, sessionState, QrAuthStatus.FAILED, null, null);
            } catch (Exception innerEx) {
                System.err.println("Failed to update session to FAILED after an exception: " + innerEx.getMessage());
            }
            System.out.println("Session " + sessionId + " authentication failed due to internal error: " + e.getMessage());
            return false;
        }
    }

    private void updateSessionStatus(String redisKey, QrSessionState sessionState, QrAuthStatus status, String userId, String jwtToken) throws JsonProcessingException {
        sessionState.setStatus(status);
        sessionState.setUserId(userId);
        sessionState.setJwtToken(jwtToken);
        redisTemplate.opsForValue().set(redisKey, objectMapper.writeValueAsString(sessionState), QR_SESSION_TIMEOUT);
    }

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
