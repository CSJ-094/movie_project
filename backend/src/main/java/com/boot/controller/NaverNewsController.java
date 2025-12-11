package com.boot.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/news")
public class NaverNewsController {

    @Value("${naver.api.client-id}")
    private String clientId;

    @Value("${naver.api.client-secret}")
    private String clientSecret;

    @GetMapping
    public ResponseEntity<?> getNews(@RequestParam(name = "query", required = false, defaultValue = "영화") String query,
            @RequestParam(name = "sort", required = false, defaultValue = "date") String sort) {
        try {
            String encodedQuery = java.net.URLEncoder.encode(query, StandardCharsets.UTF_8);
            String apiURL = "https://openapi.naver.com/v1/search/news.json?query=" + encodedQuery +
                    "&display=20&start=1&sort=" + sort;

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Naver-Client-Id", clientId);
            headers.set("X-Naver-Client-Secret", clientSecret);

            HttpEntity<String> entity = new HttpEntity<>(headers);
            RestTemplate restTemplate = new RestTemplate();

            ResponseEntity<Map> response = restTemplate.exchange(URI.create(apiURL), HttpMethod.GET, entity, Map.class);

            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Collections.singletonMap("error", "Failed to fetch news: " + e.getMessage()));
        }
    }
}
