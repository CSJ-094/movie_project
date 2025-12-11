package com.boot.controller;

import com.boot.dto.QrSessionDto;
import com.boot.service.QrLoginService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/qr-login")
@RequiredArgsConstructor
public class QrLoginController {

    private final QrLoginService qrLoginService;

    /**
     * 새로운 QR 로그인 세션을 생성하고 세션 ID를 반환합니다.
     */
    @GetMapping("/generate")
    public ResponseEntity<QrSessionDto> generateQrSession() {
        QrSessionDto session = qrLoginService.createSession();
        return ResponseEntity.ok(session);
    }

    /**
     * QR 로그인 세션의 상태를 확인합니다.
     * 프론트엔드는 이 API를 주기적으로 호출(폴링)하여 로그인 상태를 확인합니다.
     */
    @GetMapping("/status/{sessionId}")
    public ResponseEntity<QrSessionDto> getSessionStatus(@PathVariable String sessionId) {
        QrSessionDto session = qrLoginService.getSessionStatus(sessionId);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(session);
    }

    /**
     * (시뮬레이션용) 모바일 기기에서 QR 코드를 스캔한 후 호출되는 API.
     * 실제 앱에서는 인증된 사용자의 토큰을 Authorization 헤더에 담아 요청해야 합니다.
     */
    @PostMapping("/scan/{sessionId}")
    public ResponseEntity<String> scanQrCode(
            @PathVariable String sessionId,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return ResponseEntity.badRequest().body("인증 토큰이 필요합니다.");
        }
        String token = authorizationHeader.substring(7);

        boolean success = qrLoginService.scanSession(sessionId, token);
        if (success) {
            return ResponseEntity.ok("QR 코드 스캔 및 로그인이 성공적으로 처리되었습니다.");
        } else {
            return ResponseEntity.badRequest().body("유효하지 않은 세션이거나 이미 처리된 세션입니다.");
        }
    }
}
