package com.boot.service;

import com.boot.dto.MovieDoc;
import com.boot.dto.QuickMatchGenrePreferenceDto;
import com.boot.dto.QuickMatchResultSummaryDto;
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
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiRecommendationService {

    private final ObjectMapper objectMapper;

    @Value("${openai.api-key}")
    private String openAiApiKey;

    private final RestClient openAiClient = RestClient.builder()
            .baseUrl("https://api.openai.com/v1")
            .build();

    /**
     * 퀵매치 결과용 AI 추천 문구 생성
     */
    public List<String> generateReasons(QuickMatchResultSummaryDto summary,
                                        List<MovieDoc> movies) {

        if (movies == null || movies.isEmpty()) {
            return List.of();
        }

        String prompt = buildPrompt(summary, movies);
        String contentJson = callLlm(prompt); // LLM이 반환한 JSON 문자열

        try {
            JsonNode root = objectMapper.readTree(contentJson);
            JsonNode reasonsNode = root.get("reasons");

            if (reasonsNode == null || !reasonsNode.isArray()) {
                log.warn("AI 추천 이유 JSON 형식 이상: {}", contentJson);
                return fallbackReasons(movies.size());
            }

            List<String> reasons =
                    // 배열 길이만큼 순서대로 문자열 꺼내기
                    // (영화 개수보다 적을 수 있으니까 나중에 보정)
                    toStringList(reasonsNode);

            // 영화 개수와 맞춰서 부족분은 기본 문구로 채움
            return normalizeSize(reasons, movies.size());

        } catch (Exception e) {
            log.error("AI 추천 이유 JSON 파싱 실패: {}", e.getMessage(), e);
            return fallbackReasons(movies.size());
        }
    }

    private String buildPrompt(QuickMatchResultSummaryDto summary,
                               List<MovieDoc> movies) {

        StringBuilder sb = new StringBuilder();

        sb.append("당신은 영화 추천 서비스를 위한 설명 문구 생성 AI입니다.\n");
        sb.append("사용자의 퀵매치 결과를 기반으로, 각 영화를 왜 추천했는지 자연스럽게 설명해 주세요.\n\n");

        sb.append("[사용자 취향 요약]\n");
        sb.append("- 좋아요 개수: ").append(summary.getLikedCount())
                .append(", 싫어요 개수: ").append(summary.getDislikedCount()).append("\n");

        sb.append("- 선호 장르: ");
        if (summary.getTopGenres() != null && !summary.getTopGenres().isEmpty()) {
            String genreText = summary.getTopGenres().stream()
                    .map(QuickMatchGenrePreferenceDto::getName)
                    .limit(3)
                    .collect(Collectors.joining(", "));
            sb.append(genreText);
        } else {
            sb.append("특정 장르 편향 없음");
        }
        sb.append("\n");

        sb.append("- 선호 연도대: ").append(summary.getPreferredYearRange()).append("\n\n");

        sb.append("[요청]\n");
        sb.append("아래 영화 각각에 대해, '왜 이 영화를 추천하는지'를 1문장으로 작성하세요.\n");
        sb.append("조건:\n");
        sb.append("1) 한국어, 존댓말\n");
        sb.append("2) 40~80자 정도 길이\n");
        sb.append("3) 과장된 표현(인생 영화, 무조건 보세요 등) 금지\n");
        sb.append("4) 각 영화마다 말투/포인트를 약간씩 다르게\n");
        sb.append("5) 반드시 다음 JSON 형식으로만 출력:\n");
        sb.append("{ \"reasons\": [\"문장1\", \"문장2\", ...] }\n\n");

        sb.append("[추천 영화 목록]\n");
        for (int i = 0; i < movies.size(); i++) {
            MovieDoc m = movies.get(i);
            sb.append(i + 1).append(") 제목: ").append(m.getTitle()).append("\n");
            sb.append("   줄거리: ").append(
                    m.getOverview() != null ? m.getOverview() : "줄거리 정보 없음"
            ).append("\n");
            sb.append("   평점: ").append(m.getVoteAverage()).append("\n\n");
        }

        return sb.toString();
    }

    private String callLlm(String prompt) {
        long start = System.currentTimeMillis();
        try {
            Map<String, Object> body = new HashMap<>();

            body.put("model", "gpt-4o-mini");
            body.put("response_format", Map.of("type", "json_object"));

            List<Map<String, String>> messages = List.of(
                    Map.of("role", "system",
                            "content", "너는 영화 추천 이유를 한국어로 생성하는 어시스턴트다. 반드시 유효한 JSON만 출력한다."),
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
            log.info("AI 추천 이유 LLM 호출 성공. 소요 시간 = {} ms, 프롬프트 길이 = {} chars",
                    (end - start), prompt.length());

            String content = response
                    .get("choices").get(0)
                    .get("message").get("content")
                    .asText();

            return content;

        } catch (Exception e) {
            long end = System.currentTimeMillis();
            log.error("AI 추천 이유 LLM 호출 실패. 소요 시간 = {} ms, 에러 = {}",
                    (end - start), e.getMessage());
            throw new RuntimeException("AI 추천 이유 LLM 호출 실패: " + e.getMessage(), e);
        }
    }

    private List<String> toStringList(JsonNode arrayNode) {
        List<String> out = new java.util.ArrayList<>();
        arrayNode.forEach(n -> out.add(n.asText()));
        return out;
    }

    private List<String> normalizeSize(List<String> reasons, int targetSize) {
        // 영화 개수보다 많으면 잘라내고, 적으면 기본 문구로 채우기
        String defaultMsg = "당신의 취향과 비슷한 분위기의 작품이라 추천드렸어요.";
        if (reasons.size() > targetSize) {
            return reasons.subList(0, targetSize);
        }
        if (reasons.size() == targetSize) {
            return reasons;
        }
        // 부족할 때
        var copy = new java.util.ArrayList<>(reasons);
        while (copy.size() < targetSize) {
            copy.add(defaultMsg);
        }
        return copy;
    }

    private List<String> fallbackReasons(int size) {
        String defaultMsg = "당신의 취향과 장르 선호를 반영해 고른 추천 작품이에요.";
        return java.util.Collections.nCopies(size, defaultMsg);
    }
}

