package com.boot.config;

import com.boot.jwt.JwtAuthenticationFilter;
import com.boot.jwt.JwtTokenProvider;
import com.boot.security.oauth2.OAuth2AuthenticationSuccessHandler;
import com.boot.service.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager; // AuthenticationManager 임포트
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration; // AuthenticationConfiguration 임포트
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.http.HttpMethod;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtTokenProvider jwtTokenProvider;
        private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;
        private final JwtAuthenticationFilter jwtAuthenticationFilter;

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }


    // AuthenticationManager 빈 노출
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   CustomOAuth2UserService customOAuth2UserService) throws Exception {

                http
                                // CORS 설정
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                // HTTP Basic 인증 비활성화
                                .httpBasic(httpBasic -> httpBasic.disable())
                                // Form Login 비활성화
                                .formLogin(formLogin -> formLogin.disable())
                                // CSRF 비활성화 (JWT)
                                .csrf(csrf -> csrf.disable())
                                // 세션 사용 안 함
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))


                // 인가 설정
                .authorizeHttpRequests(authz -> authz
                        // QR 인증 관련 엔드포인트 공개 (가장 먼저 위치)
                        .requestMatchers("/api/qr-auth/**").permitAll()

                        // 로그인/회원가입/이메일 인증/소셜 로그인 등 공개
                        .requestMatchers("/api/user/login", "/api/user/signup",
                                "/api/user/verify", "/", "/auth/**", "/oauth2/**",
                                "/login/**", "/error")
                        .permitAll()

                                                // Swagger 공개
                                                .requestMatchers("/v3/api-docs/**", "/swagger-ui.html",
                                                                "/swagger-ui/**", "/swagger-resources/**",
                                                                "/webjars/**")
                                                .permitAll()

                                                // 관리자 전용
                                                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                                                // GET 요청은 누구나 가능하도록 설정
                                                .requestMatchers(HttpMethod.GET,
                                                                "/api/movies/**",
                                                                "/api/search/**",
                                                                "/api/reviews/**",
                                                                "/api/theaters/**",
                                                                "/api/showtimes/**",
                                                                 "/api/bookings/showtime/**",
                                                                "/api/favorites/**",
                                                                "/api/watchlist/**",
                                                                "/api/news/**")
                                                .permitAll()

                                                // 퀵매칭 전체 공개 (모든 메서드)
                                                .requestMatchers("/api/quickmatch/**").permitAll()

                                                // 리뷰 작성(POST)은 인증된 사용자만 가능
                                                .requestMatchers(HttpMethod.POST, "/api/reviews").authenticated()

                                                // 나머지는 인증 필요
                                                .anyRequest().authenticated())

                                // OAuth2 로그인 설정
                                .oauth2Login(oauth2 -> oauth2
                                                .userInfoEndpoint(userInfo -> userInfo
                                                                .userService(customOAuth2UserService))
                                                .successHandler(oAuth2AuthenticationSuccessHandler))

                                // JWT 필터 추가
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

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
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }
}
