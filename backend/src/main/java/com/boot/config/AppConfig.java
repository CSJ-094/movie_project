package com.boot.config;

import org.springframework.context.annotation.Configuration;

@Configuration
public class AppConfig {
    // passwordEncoder 빈 정의를 제거합니다.
    // @Bean
    // public PasswordEncoder passwordEncoder() {
    //     return new BCryptPasswordEncoder();
    // }
}
