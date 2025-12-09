package com.boot.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReviewTranslationService {

    private final ObjectMapper objectMapper;

    @Value("${openai.api-key}")
    private String openAiApiKey;

    private final RestClient openAiClient = RestClient.builder()
            .baseUrl("https://api.openai.com/v1")
            .build();

    public String translateToKorean(String text) {
        if (text == null || text.isBlank()) return null;

        String prompt = """
                다음 문장을 자연스러운 한국어로 번역해라.
                설명 없이 번역된 문장만 출력하라.

                """ + text;

        try {
            Map<String, Object> body = new HashMap<>();
            body.put("model", "gpt-4o-mini");

            List<Map<String, String>> messages = List.of(
                    Map.of("role", "system", "content", "너는 뛰어난 번역가이다. 한국어로 자연스럽게 번역한다."),
                    Map.of("role", "user", "content", prompt)
            );
            body.put("messages", messages);

            JsonNode response = openAiClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + openAiApiKey)
                    .header("Content-Type", "application/json")
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            return response.get("choices").get(0).get("message").get("content").asText();
        } catch (Exception e) {
            return null; // 실패하면 그냥 번역 없이 원문만 보여주자
        }
    }
}

