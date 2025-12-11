package com.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QrAuthRequest {
    private String sessionId;
    private String username;
    private String password;
    private String mobileAuthToken; // 모바일 앱에서 JWT 토큰을 직접 보낼 경우를 대비한 필드 (선택 사항)
}
