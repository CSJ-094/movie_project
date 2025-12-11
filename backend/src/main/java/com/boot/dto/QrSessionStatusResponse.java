package com.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QrSessionStatusResponse {
    public enum QrAuthStatus {
        PENDING,        // 인증 대기 중
        AUTHENTICATED,  // 인증 성공
        FAILED,         // 인증 실패
        EXPIRED         // 세션 만료
    }

    private String sessionId;
    private QrAuthStatus status;
    private String token; // 인증 성공 시 웹 클라이언트에 전달할 JWT 토큰
    private String message;
}
