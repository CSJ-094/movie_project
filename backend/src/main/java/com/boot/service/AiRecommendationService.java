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

import java.util.*;
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

    /**
     * 퀵매치 요약 정보로 취향 타입 이름 생성
     * 예: "감성적인 모험러", "잔잔한 현실주의자"
     */
    public String generateTasteType(
            List<QuickMatchGenrePreferenceDto> topGenres,
            String preferredYearRange,
            Double avgRating
    ) {
        // 데이터가 너무 없으면 굳이 LLM 호출 안 함
        if ((topGenres == null || topGenres.isEmpty()) && avgRating == null) {
            return "취향 데이터가 아직 부족해요";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("당신은 사용자의 영화 취향을 한 문장으로 이름 붙여주는 전문가입니다.\n\n");
        sb.append("[사용자 취향 정보]\n");

        if (topGenres != null && !topGenres.isEmpty()) {
            String genres = topGenres.stream()
                    .map(QuickMatchGenrePreferenceDto::getName)
                    .limit(3)
                    .collect(Collectors.joining(", "));
            sb.append("- 선호 장르: ").append(genres).append("\n");
        } else {
            sb.append("- 선호 장르: 뚜렷한 편향 없음\n");
        }

        if (preferredYearRange != null) {
            sb.append("- 선호 시기(연도대): ").append(preferredYearRange).append("\n");
        }
        if (avgRating != null) {
            sb.append("- 좋아요한 영화 평균 평점: ").append(String.format("%.1f", avgRating)).append("\n");
        }

        sb.append("\n[요청]\n");
        sb.append("위 정보를 바탕으로 사용자의 영화 취향을 표현하는 짧은 타입 이름을 만드세요.\n");
        sb.append("조건:\n");
        sb.append("1) 6~12자 정도의 한국어\n");
        sb.append("2) 예시: \"감성적인 모험러\", \"현실적인 로맨스 러버\" 등\n");
        sb.append("3) 한 가지 이름만 출력\n");
        sb.append("4) 반드시 JSON 형식으로만 출력:\n");
        sb.append("{ \"tasteType\": \"감성적인 모험러\" }\n");

        String contentJson = callLlm(sb.toString());

        try {
            JsonNode root = objectMapper.readTree(contentJson);
            JsonNode node = root.get("tasteType");
            if (node == null || node.isNull()) {
                log.warn("취향 타입 JSON에 tasteType 없음: {}", contentJson);
                return "취향 타입 분석 중입니다";
            }
            return node.asText();
        } catch (Exception e) {
            log.error("취향 타입 JSON 파싱 실패: {}", e.getMessage(), e);
            return "취향 타입 분석 중입니다";
        }
    }

    /**
     * 좋아요한 영화들의 줄거리 기반으로 핵심 키워드 뽑기
     */
    public List<String> extractMainKeywords(List<MovieDoc> likedMovies, int maxKeywords) {
        if (likedMovies == null || likedMovies.isEmpty()) {
            return List.of();
        }

        // 너무 많으면 10개 정도까지만 잘라서 프롬프트 길이 줄이기
        List<MovieDoc> sample = likedMovies.stream()
                .limit(10)
                .toList();

        StringBuilder sb = new StringBuilder();
        sb.append("당신은 사용자의 영화 취향을 설명하는 핵심 키워드를 뽑는 전문가입니다.\n\n");
        sb.append("[사용자가 좋아요한 영화 목록]\n");
        for (int i = 0; i < sample.size(); i++) {
            MovieDoc m = sample.get(i);
            sb.append(i + 1).append(") 제목: ").append(m.getTitle()).append("\n");
            sb.append("   줄거리: ").append(
                    m.getOverview() != null ? m.getOverview() : "줄거리 정보 없음"
            ).append("\n\n");
        }

        sb.append("[요청]\n");
        sb.append("위 영화들을 전반적으로 봤을 때 공통적으로 드러나는 키워드(주제, 분위기, 소재 등)를 ")
                .append(maxKeywords).append("개 이내로 골라 주세요.\n");
        sb.append("예: [\"가족\", \"모험\", \"성장\", \"우정\"]\n");
        sb.append("반드시 다음 JSON 형식으로만 출력하세요.\n");
        sb.append("{ \"keywords\": [\"키워드1\", \"키워드2\", ...] }\n");

        String contentJson = callLlm(sb.toString());

        try {
            JsonNode root = objectMapper.readTree(contentJson);
            JsonNode arr = root.get("keywords");
            if (arr == null || !arr.isArray()) {
                log.warn("키워드 JSON 형식 이상: {}", contentJson);
                return List.of();
            }
            return toStringList(arr).stream()
                    .limit(maxKeywords)
                    .toList();
        } catch (Exception e) {
            log.error("키워드 JSON 파싱 실패: {}", e.getMessage(), e);
            return List.of();
        }
    }

    /**
     * 한 장 더 뽑기(대체 추천)용 이유 문구 생성
     */
    public String generateAlternativeReason(
            List<QuickMatchGenrePreferenceDto> topGenres,
            String preferredYearRange,
            Double avgRating,
            MovieDoc candidate
    ) {
        StringBuilder sb = new StringBuilder();

        sb.append("당신은 영화 추천 서비스에서 '대체 추천' 이유를 설명하는 AI입니다.\n\n");
        sb.append("[사용자 취향 요약]\n");
        if (topGenres != null && !topGenres.isEmpty()) {
            String genres = topGenres.stream()
                    .map(QuickMatchGenrePreferenceDto::getName)
                    .limit(3)
                    .collect(Collectors.joining(", "));
            sb.append("- 선호 장르: ").append(genres).append("\n");
        } else {
            sb.append("- 선호 장르: 뚜렷한 편향 없음\n");
        }

        if (preferredYearRange != null) {
            sb.append("- 선호 시기: ").append(preferredYearRange).append("\n");
        }
        if (avgRating != null) {
            sb.append("- 평균 선호 평점: ").append(String.format("%.1f", avgRating)).append("\n");
        }

        sb.append("\n[대체 추천 영화 정보]\n");
        sb.append("- 제목: ").append(candidate.getTitle()).append("\n");
        sb.append("- 줄거리: ").append(
                candidate.getOverview() != null ? candidate.getOverview() : "줄거리 정보 없음"
        ).append("\n");
        sb.append("- 평점: ").append(candidate.getVoteAverage()).append("\n\n");

        sb.append("[요청]\n");
        sb.append("위 정보를 바탕으로, 왜 이 영화를 '대체 추천'으로 보여주는지 1개의 문장으로 설명하세요.\n");
        sb.append("조건:\n");
        sb.append("1) 한국어 존댓말, 40~80자 정도\n");
        sb.append("2) '이 영화를 추천드립니다' 같은 말투는 피하기\n");
        sb.append("3) 사용자의 취향과 이 영화의 포인트를 자연스럽게 연결\n");
        sb.append("4) 반드시 다음 JSON 형식으로만 출력:\n");
        sb.append("{ \"reason\": \"문장 내용\" }\n");

        String contentJson = callLlm(sb.toString());

        try {
            JsonNode root = objectMapper.readTree(contentJson);
            JsonNode node = root.get("reason");
            if (node == null || node.isNull()) {
                log.warn("대체 추천 이유 JSON에 reason 없음: {}", contentJson);
                return "이전 취향과 비슷한 결을 가진 작품이라 대체 추천으로 보여드렸어요.";
            }
            return node.asText();
        } catch (Exception e) {
            log.error("대체 추천 이유 JSON 파싱 실패: {}", e.getMessage(), e);
            return "이전 취향과 비슷한 결을 가진 작품이라 대체 추천으로 보여드렸어요.";
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

    // 결과(여러 장)에서만 쓰는 안전장치: LLM이 덜 주거나/더 주는 경우 보정
    private List<String> normalizeSize(List<String> reasons, int targetSize) {
        if (reasons.size() > targetSize) return reasons.subList(0, targetSize);
        if (reasons.size() == targetSize) return reasons;

        List<String> copy = new ArrayList<>(reasons);
        while (copy.size() < targetSize) copy.add("추천 이유 생성에 실패해 기본 문구로 대체했어요.");
        return copy;
    }

    // 결과(여러 장)에서만 쓰는 안전장치
    private List<String> fallbackReasons(int size) {
        return Collections.nCopies(size, "추천 이유 생성에 실패해 기본 문구로 대체했어요.");
    }

    // 한 장 더 뽑기용 최소 안전장치 (LLM 실패하면 화면이 깨지면 안 되니까)
    private String fallbackAlternativeReason() {
        return "이번 세션에서 보인 취향과 비슷한 결을 유지하면서, 너무 겹치지 않는 방향으로 골라봤어요.";
    }
}

