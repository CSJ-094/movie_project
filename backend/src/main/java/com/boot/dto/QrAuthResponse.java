package com.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QrAuthResponse {
    private String sessionId;
    private String message;
    private String token; // 웹 클라이언트에 전달할 JWT 토큰 (인증 성공 시)
}
