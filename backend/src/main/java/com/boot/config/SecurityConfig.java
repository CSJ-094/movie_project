package com.boot.config;

import com.boot.jwt.JwtAuthenticationFilter;
import com.boot.jwt.JwtTokenProvider;
import com.boot.security.oauth2.OAuth2AuthenticationSuccessHandler;
import com.boot.service.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.http.HttpMethod;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher; // [필수] 이 import 확인!
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtTokenProvider jwtTokenProvider;
        // private final CustomOAuth2UserService customOAuth2UserService; // 순환 참조 해결을
        // 위해 제거
        private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http,
                        CustomOAuth2UserService customOAuth2UserService) throws Exception { // 파라미터로 주입
                // CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler(); // CSRF 비활성화로 인해 이 코드는 필요 없습니다.
                // Spring Security 6.1 이상에서는 CSRF 토큰을 request attribute에서 찾는 것을 기본으로 하므로,
                // 헤더에서 찾도록 하려면 이 핸들러가 필요합니다.
                // requestHandler.setCsrfRequestAttributeName(null); // CSRF 비활성화로 인해 이 코드는 필요 없습니다.

                http
                                // CORS 설정을 Spring Security와 통합
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                // HTTP Basic 인증 비활성화
                                .httpBasic(httpBasic -> httpBasic.disable())
                                // Form Login 비활성화
                                .formLogin(formLogin -> formLogin.disable())
                                // CSRF 보호 비활성화 (JWT 사용 시 일반적으로 비활성화)
                                .csrf(csrf -> csrf.disable())
                                // 세션을 사용하지 않으므로 STATELESS로 설정
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                                // HTTP 요청에 대한 접근 권한 설정
                                .authorizeHttpRequests(authz -> authz
                                                // 로그인, 회원가입, 이메일 인증, OAuth2 관련 경로는 누구나 접근 허용 (가장 먼저 선언)
                                                .requestMatchers("/api/user/login", "/api/user/signup",
                                                                "/api/user/verify", "/", "/auth/**", "/oauth2/**",
                                                                "/login/**", "/error")
                                                .permitAll()
                                                // Swagger 관련 API는 누구나 접근 허용
                                                .requestMatchers("/v3/api-docs/**", "/swagger-ui.html",
                                                                "/swagger-ui/**", "/swagger-resources/**",
                                                                "/webjars/**")
                                                .permitAll()
                                                // 관리자 API는 ADMIN 역할만 접근 가능
                                                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                                                .requestMatchers(HttpMethod.GET, "/api/movies/**", "/api/search/**")
                                                .permitAll() // 영화 정보 조회, 검색 등 GET 요청 허용
                                                // 그 외 모든 요청은 인증된 사용자만 접근 가능
                                                .anyRequest().authenticated())

                                // OAuth2 로그인 설정
                                .oauth2Login(oauth2 -> oauth2
                                                .userInfoEndpoint(userInfo -> userInfo
                                                                .userService(customOAuth2UserService)) // 소셜 로그인 성공 시 후속
                                                                                                       // 조치를 진행할
                                                                                                       // UserService
                                                                                                       // 인터페이스의 구현체 등록
                                                .successHandler(oAuth2AuthenticationSuccessHandler)) // 로그인 성공 시 핸들러

                                // JWT 인증 필터를 UsernamePasswordAuthenticationFilter 앞에 추가
                                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider),
                                                UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();
                configuration.setAllowedOrigins(List.of("http://localhost:5173")); // 프론트엔드 주소
                configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
                configuration.setAllowedHeaders(List.of("*"));
                configuration.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration); // 모든 경로에 대해 위 설정 적용
                return source;
        }

}