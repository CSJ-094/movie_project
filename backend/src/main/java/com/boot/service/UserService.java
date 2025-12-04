package com.boot.service;

import com.boot.dto.TokenInfo;
import com.boot.dto.UserSignUpDto;
import com.boot.entity.User;
import com.boot.entity.VerificationToken;
import com.boot.jwt.JwtTokenProvider;
import com.boot.repository.UserRepository;
import com.boot.repository.VerificationTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional; // Optional import 추가
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final VerificationTokenRepository tokenRepository;
    private final EmailService emailService;
    private final AuthenticationManagerBuilder authenticationManagerBuilder;
    private final JwtTokenProvider jwtTokenProvider;

    // 이메일로 사용자 조회 (ReviewService에서 사용)
    @Transactional(readOnly = true)
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    // ID로 사용자 조회 (ReviewService에서 사용)
    @Transactional(readOnly = true)
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    @Transactional
    public void signUp(UserSignUpDto userSignUpDto) {
        // 이메일 중복 확인
        if (userRepository.findByEmail(userSignUpDto.getEmail()).isPresent()) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        // 비밀번호 암호화
        String encodedPassword = passwordEncoder.encode(userSignUpDto.getPassword());

        // 사용자 역할 설정 (기본값: USER)
        User user = userSignUpDto.toEntity(encodedPassword, "ROLE_USER");
        User savedUser = userRepository.save(user);

        // 인증 토큰 생성 및 저장
        String token = UUID.randomUUID().toString();
        VerificationToken verificationToken = new VerificationToken(token, savedUser);
        tokenRepository.save(verificationToken);

        // 이메일 발송
        String subject = "[Movie Project] 회원가입 이메일 인증";
        String verificationLink = "http://localhost:8484/api/user/verify?token=" + token;
        String emailBody = "<h1>회원가입을 완료하려면 아래 링크를 클릭하세요.</h1>" +
                "<a href='" + verificationLink + "'>인증하기</a>";
        emailService.sendVerificationEmail(savedUser.getEmail(), subject, emailBody);
    }

    @Transactional(readOnly = true)
    public TokenInfo login(String email, String password) {
        // 1. 이메일 기반으로 User 확인 및 계정 활성화 여부 체크
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("가입되지 않은 이메일입니다."));
        if (!user.isEnabled()) {
            throw new IllegalArgumentException("이메일 인증이 완료되지 않은 계정입니다.");
        }

        // 2. Login ID/PW 를 기반으로 Authentication 객체 생성
        UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(email,
                password);

        // 3. 실제 검증 (사용자 비밀번호 체크)
        Authentication authentication = authenticationManagerBuilder.getObject().authenticate(authenticationToken);

        // 4. 인증 정보를 기반으로 JWT 토큰 생성
        return jwtTokenProvider.generateToken(authentication);
    }

    @Transactional
    public void verifyEmail(String token) {
        VerificationToken verificationToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 토큰입니다."));

        if (verificationToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("만료된 토큰입니다.");
        }

        User user = verificationToken.getUser();
        if (user.isEnabled()) {
            throw new IllegalStateException("이미 인증된 계정입니다.");
        }
        user.enable(); // User 엔티티의 enabled 필드를 true로 변경
        userRepository.save(user);
    }

    @Transactional
    public void deleteUser() {
        // 현재 인증된 사용자의 이메일 가져오기
        String email = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication()
                .getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 연관된 토큰 삭제 (Cascade 설정이 안되어 있을 경우를 대비)
        tokenRepository.deleteByUser(user);

        userRepository.delete(user);
    }
}
