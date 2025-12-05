package com.boot.controller;

import com.boot.dto.UserProfileDto;
import com.boot.service.UserProfileService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    @Operation(summary = "사용자 프로필 조회", description = "현재 로그인한 사용자의 프로필 정보를 조회합니다. (찜한 영화, 평점, 리뷰, Watchlist 포함)")
    @GetMapping("/profile")
    public ResponseEntity<UserProfileDto> getUserProfile() {
        UserProfileDto userProfile = userProfileService.getUserProfile();
        return ResponseEntity.ok(userProfile);
    }
}
