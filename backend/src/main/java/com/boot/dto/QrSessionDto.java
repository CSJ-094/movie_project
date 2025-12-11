package com.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QrSessionDto {
    private String sessionId;
    private String status; // PENDING, SCANNED, COMPLETED
    private String userToken; // 로그인 완료 시 JWT 토큰
}
