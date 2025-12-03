package com.boot.controller;

import com.boot.dto.TokenInfo;
import com.boot.dto.UserSignUpDto;
import com.boot.dto.UserLoginDto;
import com.boot.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/signup")
    public ResponseEntity<String> signUp(@RequestBody UserSignUpDto userSignUpDto) {
        try {
            userService.signUp(userSignUpDto);
            return ResponseEntity.ok("회원가입이 성공적으로 완료되었습니다. 이메일 인증을 진행해주세요.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<TokenInfo> login(@RequestBody UserLoginDto userLoginDto) {
        try {
            TokenInfo tokenInfo = userService.login(userLoginDto.getEmail(), userLoginDto.getPassword());
            return ResponseEntity.ok(tokenInfo);
        } catch (IllegalArgumentException e) {
            // 예외 처리를 더 세분화할 수 있습니다. 여기서는 간단히 400으로 처리합니다.
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/verify")
    public ResponseEntity<String> verifyEmail(@RequestParam("token") String token) {
        try {
            userService.verifyEmail(token);
            return ResponseEntity.ok("이메일 인증이 성공적으로 완료되었습니다. 이제 로그인할 수 있습니다.");
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}