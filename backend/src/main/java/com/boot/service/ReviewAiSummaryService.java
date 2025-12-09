package com.boot.service;

import com.boot.dto.MovieReviewDto;
import com.boot.dto.ReviewSummaryDto;
import com.boot.util.ReviewSelector;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewAiSummaryService {

    private final ObjectMapper objectMapper;
    private final ReviewSelector reviewSelector;

    @Value("${openai.api-key}")
    private String openAiApiKey;

    private final RestClient openAiClient = RestClient.builder()
            .baseUrl("https://api.openai.com/v1")
            .build();

    public ReviewSummaryDto summarize(List<MovieReviewDto> reviews) {

        long startTotal = System.currentTimeMillis(); // 시작 시간 찍기

        if (reviews == null || reviews.isEmpty()) {
            return ReviewSummaryDto.builder()
                    .goodPoints("리뷰가 부족하여 요약할 수 없습니다.")
                    .badPoints("")
                    .overall("")
                    .positiveRatio(0.0)
                    .negativeRatio(0.0)
                    .neutralRatio(0.0)
                    .build();
        }

        List<MovieReviewDto> selected = reviewSelector.select(reviews);

        String reviewTextBlock = buildReviewTextBlock(selected);
        String prompt = buildPrompt(reviewTextBlock);

        // 실제 LLM 호출
        String llmResponseJson = callLlm(prompt);

        try {
            JsonNode node = objectMapper.readTree(llmResponseJson);

            long endTotal = System.currentTimeMillis();
            log.info("요약 완료. 소요 시간: {} ms, 리뷰 입력 개수: {}",
                    (endTotal - startTotal), selected.size());

            return ReviewSummaryDto.builder()
                    .goodPoints(node.get("goodPoints").asText())
                    .badPoints(node.get("badPoints").asText())
                    .overall(node.get("overall").asText())
                    .positiveRatio(node.get("positiveRatio").asDouble())
                    .negativeRatio(node.get("negativeRatio").asDouble())
                    .neutralRatio(node.get("neutralRatio").asDouble())
                    .build();

        } catch (Exception e) {
            log.error("요약 JSON 파싱 실패: {}", e.getMessage(), e);
            return ReviewSummaryDto.builder()
                    .goodPoints("요약 처리 중 오류가 발생했습니다.")
                    .badPoints("")
                    .overall("")
                    .positiveRatio(0.0)
                    .negativeRatio(0.0)
                    .neutralRatio(0.0)
                    .build();
        }
    }

    private String buildReviewTextBlock(List<MovieReviewDto> reviews) {
        StringBuilder sb = new StringBuilder();
        int index = 1;
        for (MovieReviewDto r : reviews) {
            String text = (r.getTranslated() != null && !r.getTranslated().isBlank())
                    ? r.getTranslated()
                    : r.getContent();

            sb.append(index++)
                    .append(") ")
                    .append(text)
                    .append("\n");
        }
        return sb.toString();
    }

    private String buildPrompt(String reviewTextBlock) {
        return """
            너는 영화 리뷰 요약기다.
            아래는 여러 사용자가 남긴 영화 리뷰 목록이다.
            영어 리뷰도 있고 한국어 리뷰도 있을 수 있다.

            [리뷰 목록]
            """ + reviewTextBlock + """

            이 리뷰들을 바탕으로 다음 정보를 모두 **한국어로** 작성해라.

            - goodPoints: 사람들이 공통적으로 좋다고 말하는 점 요약 (2~3줄, 한국어)
            - badPoints: 사람들이 공통적으로 아쉽다고 말하는 점 요약 (2~3줄, 한국어)
            - overall: 이 영화를 한 줄로 평가하는 문장 (한국어)
            - positiveRatio: 긍정 리뷰 비율(0~1 사이 숫자)
            - negativeRatio: 부정 리뷰 비율
            - neutralRatio: 중립 비율(0~1 사이 숫자)

            반드시 다음 JSON 형식으로만 출력해라:
            {
              "goodPoints": "...",
              "badPoints": "...",
              "overall": "...",
              "positiveRatio": 0.7,
              "negativeRatio": 0.2,
              "neutralRatio": 0.1
            }
            """;
    }


    private String callLlm(String prompt) {
        long start = System.currentTimeMillis();
        try {
            Map<String, Object> body = new HashMap<>();

            body.put("model", "gpt-4o-mini");
            body.put("response_format", Map.of("type", "json_object"));

            List<Map<String, String>> messages = List.of(
                    Map.of("role", "system",
                            "content", "너는 영화 리뷰를 한국어로 요약하고 감정을 분석하는 어시스턴트다. 반드시 유효한 JSON만 출력한다."),
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

            long end = System.currentTimeMillis();
            log.info("LLM 호출 성공. 소요 시간 = {} ms, 프롬프트 길이 = {} chars",
                    (end - start), prompt.length());

            String content = response
                    .get("choices").get(0)
                    .get("message").get("content")
                    .asText();

            return content;

        } catch (Exception e) {
            long end = System.currentTimeMillis();
            log.error("LLM 호출 실패. 소요 시간 = {} ms, 에러 = {}",
                    (end - start), e.getMessage());
            throw new RuntimeException("LLM 호출 실패: " + e.getMessage(), e);
        }
    }

}
