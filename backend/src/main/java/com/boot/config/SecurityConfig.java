package com.boot.config;

import com.boot.jwt.JwtAuthenticationFilter;
import com.boot.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManagerBuilder authenticationManagerBuilder;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // CORS 설정을 Spring Security와 통합
                .cors(Customizer.withDefaults())
                // HTTP Basic 인증 비활성화
                .httpBasic(httpBasic -> httpBasic.disable())
                // Form Login 비활성화
                .formLogin(formLogin -> formLogin.disable())
                // CSRF 보호 비활성화 (JWT 사용 시 일반적으로 비활성화)
                .csrf(csrf -> csrf.disable()) // Spring Boot 3.1 이상에서는 .csrf(AbstractHttpConfigurer::disable)
                // 세션을 사용하지 않음 (STATELESS로 설정)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // HTTP 요청에 대한 접근 권한 설정
                .authorizeHttpRequests(authz -> authz
                        // 로그인, 회원가입, 이메일 인증, 영화 검색 API는 누구나 접근 허용
                        .requestMatchers("/api/user/login", "/api/user/signup", "/api/user/verify").permitAll()
                        // 관리자 API는 ADMIN 역할만 접근 가능
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/movies/**").permitAll()
                        // 그 외 모든 요청은 인증된 사용자만 접근 가능
                        .anyRequest().authenticated())
                // JWT 인증 필터를 UsernamePasswordAuthenticationFilter 앞에 추가
                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }
}