package com.boot.controller;

import com.boot.dto.QrAuthRequest;
import com.boot.dto.QrAuthResponse;
import com.boot.dto.QrSessionStatusResponse;
import com.boot.service.QrAuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/qr-auth")
public class QrAuthController {

    private final QrAuthService qrAuthService;

    public QrAuthController(QrAuthService qrAuthService) {
        this.qrAuthService = qrAuthService;
    }

    /**
     * 웹 클라이언트가 QR 코드 인증 세션을 시작할 때 호출됩니다.
     * 고유한 세션 ID를 생성하고 반환합니다.
     */
    @PostMapping("/session")
    public ResponseEntity<QrAuthResponse> generateQrSession() {
        String sessionId = qrAuthService.generateSession();
        return ResponseEntity.ok(new QrAuthResponse(sessionId, "QR session generated.", null));
    }

    /**
     * 모바일 앱이 QR 코드를 스캔한 후 사용자 인증 정보를 백엔드로 보낼 때 호출됩니다.
     * 세션 ID와 모바일 인증 토큰을 받아 인증을 처리합니다.
     */
    @PostMapping("/authenticate")
    public ResponseEntity<QrAuthResponse> authenticateQrSession(@RequestBody QrAuthRequest request) {
        // QrAuthService의 authenticateSession 메서드 시그니처 변경에 맞춰 호출
        boolean authenticated = qrAuthService.authenticateSession(
                request.getSessionId(),
                request.getMobileAuthToken(),
                request.getUsername(),
                request.getPassword()
        );
        if (authenticated) {
            return ResponseEntity.ok(new QrAuthResponse(request.getSessionId(), "Authentication successful.", null));
        } else {
            return ResponseEntity.status(401).body(new QrAuthResponse(request.getSessionId(), "Authentication failed.", null));
        }
    }

    /**
     * 웹 클라이언트가 특정 세션 ID의 인증 상태를 주기적으로 확인할 때 호출됩니다.
     * 세션의 현재 상태를 반환합니다.
     */
    @GetMapping("/status/{sessionId}")
    public ResponseEntity<QrSessionStatusResponse> getQrSessionStatus(@PathVariable String sessionId) {
        QrSessionStatusResponse statusResponse = qrAuthService.getSessionStatus(sessionId);
        return ResponseEntity.ok(statusResponse);
    }
}
