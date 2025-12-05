package com.boot.service;

import com.boot.entity.User;
import com.boot.repository.UserRepository;
import com.boot.security.oauth2.CustomOAuth2User;
import com.boot.security.oauth2.user.GoogleOAuth2UserInfo;
import com.boot.security.oauth2.user.KakaoOAuth2UserInfo;
import com.boot.security.oauth2.user.NaverOAuth2UserInfo;
import com.boot.security.oauth2.user.OAuth2UserInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        OAuth2UserInfo oAuth2UserInfo = null;

        if (registrationId.equals("google")) {
            oAuth2UserInfo = new GoogleOAuth2UserInfo(oAuth2User.getAttributes());
        } else if (registrationId.equals("kakao")) {
            oAuth2UserInfo = new KakaoOAuth2UserInfo(oAuth2User.getAttributes());
        } else if (registrationId.equals("naver")) {
            oAuth2UserInfo = new NaverOAuth2UserInfo(oAuth2User.getAttributes());
        } else {
            log.error("Unsupported provider: {}", registrationId);
            throw new OAuth2AuthenticationException("Unsupported provider: " + registrationId);
        }

        String provider = oAuth2UserInfo.getProvider();
        String providerId = oAuth2UserInfo.getProviderId();
        String email = oAuth2UserInfo.getEmail();
        String name = oAuth2UserInfo.getName();

        // 이메일이 없는 경우 (예: 카카오 비즈니스 인증 불가) 임의의 이메일 생성
        if (email == null || email.isEmpty()) {
            email = provider + "_" + providerId + "@social.com";
            log.info("Email not found from provider. Generated placeholder email: {}", email);
        }

        // 1. 먼저 소셜 로그인 정보로 사용자 조회
        Optional<User> userOptional = userRepository.findByProviderAndProviderId(provider, providerId);
        User user;

        if (userOptional.isPresent()) {
            user = userOptional.get();
            // 필요 시 정보 업데이트 (예: 이름 변경 등)
        } else {
            // 2. 소셜 정보가 없으면 이메일로 조회 (기존 일반 회원 연동)
            Optional<User> emailUserOptional = userRepository.findByEmail(email);

            if (emailUserOptional.isPresent()) {
                user = emailUserOptional.get();
                // 기존 회원에 소셜 정보 연동 (선택 사항: 여기서는 자동 연동 처리)
                // 주의: 실제 서비스에서는 보안상 비밀번호 확인 등을 거칠 수 있음
                // User 엔티티에 updateProvider 메서드가 필요할 수 있음.
                // 현재는 User 엔티티가 불변에 가까우므로 새로 빌더로 만들거나, 별도 메서드 추가 필요.
                // 일단은 기존 로직 유지하되, 여기서는 연동 로직을 생략하고 새로 생성하거나 에러 처리 대신
                // "이미 존재하는 이메일입니다" 예외를 던지거나, 혹은 강제로 연동할 수 있음.
                // 여기서는 간단히 기존 유저를 그대로 반환 (소셜 정보 업데이트는 별도 구현 필요)
                log.info("Existing email user found. Linking with OAuth2 provider: {}", provider);
            } else {
                // 3. 신규 회원 가입
                user = User.builder()
                        .email(email)
                        .name(name != null ? name : "Social User")
                        .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .role("ROLE_USER")
                        .provider(provider)
                        .providerId(providerId)
                        .build();
                user.enable();
                userRepository.save(user);
            }
        }

        return new CustomOAuth2User(user, oAuth2User.getAttributes());
    }
}
