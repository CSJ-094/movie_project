package com.boot.service;

import com.boot.dto.*;
import com.boot.elastic.Movie;
import com.boot.entity.QuickMatchFeedback;
import com.boot.entity.QuickMatchSession;
import com.boot.repository.QuickMatchFeedbackRepository;
import com.boot.repository.QuickMatchSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuickMatchService {

    private final QuickMatchSessionRepository sessionRepository;
    private final QuickMatchFeedbackRepository feedbackRepository;
    private final MovieSearchService movieSearchService;
    private final AiRecommendationService aiRecommendationService;

    // 장르 ID → 이름 매핑
    private static final Map<Integer, String> GENRE_NAME_MAP = Map.ofEntries(
            Map.entry(28, "액션"),
            Map.entry(12, "모험"),
            Map.entry(16, "애니메이션"),
            Map.entry(35, "코미디"),
            Map.entry(80, "범죄"),
            Map.entry(99, "다큐멘터리"),
            Map.entry(18, "드라마"),
            Map.entry(10751, "가족"),
            Map.entry(14, "판타지"),
            Map.entry(36, "역사"),
            Map.entry(27, "공포"),
            Map.entry(10402, "음악"),
            Map.entry(9648, "미스터리"),
            Map.entry(10749, "로맨스"),
            Map.entry(878, "SF"),
            Map.entry(10770, "TV 영화"),
            Map.entry(53, "스릴러"),
            Map.entry(10752, "전쟁"),
            Map.entry(37, "서부")
    );

    // 장르 설명 문구 패턴
    private static final List<String> GENRE_PATTERNS = List.of(
            "%s 장르를 특히 선호하시는 경향이 있어요.",
            "%s 장르 작품을 좋아하시는 편이에요.",
            "%s 장르 비중이 높아, 그 취향을 반영했어요.",
            "%s 계열 영화를 자주 좋아하셔서 비슷한 장르를 골랐어요.",
            "%s 장르를 즐겨 보시는 편이라, 그와 유사한 작품을 추천했어요."
    );

    // 연도(시기) 문구 패턴 – 시기 자체를 너무 강조하지 않게, 가끔만 사용
    private static final List<String> YEAR_PATTERNS = List.of(
            "%s 즈음의 작품들과 비슷한 시기의 영화예요.",
            "%s에 나온 영화들을 자주 보셔서, 그 시기의 작품을 함께 추천했어요.",
            "%s 동안 즐겨 보신 시기의 분위기를 반영했어요."
    );

    // 평점/품질 관련 문구 패턴
    private static final List<String> RATING_PATTERNS = List.of(
            "대체로 평가가 좋은 작품들로 골랐어요.",
            "비슷한 취향의 유저들이 높게 평가한 작품들이에요.",
            "전체적으로 별점이 높은 영화들 위주로 추천했어요."
    );

    // 기본 추천 문구 (장르/연도/평점 정보가 거의 없을 때)
    private static final List<String> DEFAULT_PATTERNS = List.of(
            "당신의 취향과 비슷한 인기 영화를 추천했어요.",
            "좋아요한 영화와 유사한 분위기의 작품을 골라봤어요.",
            "취향 기반으로 비슷한 느낌의 영화를 큐레이션했어요.",
            "선호하실 법한 분위기의 영화들을 엄선해 추천드려요."
    );

    private static final Random RANDOM = new Random();

    /**
     * 1) 퀵매칭 세션 생성
     * - 같은 유저가 진행 중(IN_PROGRESS) 세션이 있으면 먼저 COMPLETED로 바꾼 뒤 새 세션 생성
     */
    @Transactional
    public QuickMatchSession createSession(Long userId, Integer targetCount) {

        // 기존 진행 중 세션 있으면 종료 처리
        sessionRepository.findFirstByUserIdAndStatus(
                userId,
                QuickMatchSession.SessionStatus.IN_PROGRESS
        ).ifPresent(s -> {
            s.setStatus(QuickMatchSession.SessionStatus.COMPLETED);
            s.setCompletedAt(LocalDateTime.now());
            sessionRepository.save(s);
        });

        QuickMatchSession session = QuickMatchSession.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .targetCount(targetCount != null ? targetCount : 25) // 기본 25개
                .ratedCount(0)
                .status(QuickMatchSession.SessionStatus.IN_PROGRESS)
                .createdAt(LocalDateTime.now())
                .build();

        return sessionRepository.save(session);
    }

    /**
     * 2) 세션 조회
     */
    @Transactional(readOnly = true)
    public QuickMatchSession getSession(String sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다. sessionId=" + sessionId));
    }

    /**
     * 3) 다음 영화 가져오기
     * - 인기 + 평점 기준 상위 N개(예: 1500) 영화를 넓게 가져옴
     * - 이 세션에서 이미 평가한 영화(movieId)는 제외
     * - 시리즈/장르/분위기 반복 억제 규칙을 적용해서 후보 1개 선택
     */
    @Transactional(readOnly = true)
    public MovieDoc getNextMovie(String sessionId) {

        QuickMatchSession session = getSession(sessionId);

        // 이 세션에서 이미 평가한 영화들
        List<QuickMatchFeedback> feedbacks = feedbackRepository.findBySessionId(sessionId);

        List<String> seenMovieIds = feedbacks.stream()
                .map(QuickMatchFeedback::getMovieId)
                .toList();

        // 넓은 후보 풀: 평가수/인기도 기반으로 걸러진 유명 영화들
        List<MovieDoc> pool = movieSearchService.getWideCandidatePool();

        // 이미 평가한 영화는 제외
        pool = pool.stream()
                .filter(m -> m.getMovieId() != null && !seenMovieIds.contains(m.getMovieId()))
                .toList();

        if (pool.isEmpty()) {
            throw new RuntimeException("더 이상 보여줄 영화가 없습니다.");
        }

        // 히스토리: 이미 본 영화들의 MovieDoc 리스트
        List<MovieDoc> history = feedbacks.stream()
                .map(f -> movieSearchService.getMovieById(f.getMovieId()))
                .filter(Objects::nonNull)
                .map(this::toMovieDocSafe)
                .toList();

        // 반복 방지 규칙을 적용해서 다음 후보 하나 선택
        return selectNextCandidate(pool, history);
    }

    /**
     * 4) 피드백 저장 (LIKE / DISLIKE)
     * - 같은 세션 + 같은 영화에 대해 이미 피드백이 있으면 ratedCount는 증가시키지 않음
     * - ratedCount가 targetCount에 도달하면 세션을 COMPLETED로 변경
     */
    @Transactional
    public QuickMatchSession saveFeedback(String sessionId,
                                          Long userId,
                                          String movieId,
                                          QuickMatchFeedback.Action action) {

        QuickMatchSession session = getSession(sessionId);

        if (session.getStatus() != QuickMatchSession.SessionStatus.IN_PROGRESS) {
            throw new RuntimeException("이미 종료된 세션입니다. sessionId=" + sessionId);
        }

        // 중복 피드백 체크 (세션 + 영화 기준)
        if (!feedbackRepository.existsBySessionIdAndMovieId(sessionId, movieId)) {
            QuickMatchFeedback feedback = QuickMatchFeedback.builder()
                    .sessionId(sessionId)
                    .userId(userId)
                    .movieId(movieId)
                    .action(action)
                    .createdAt(LocalDateTime.now())
                    .build();

            feedbackRepository.save(feedback);

            // 처음 보는 영화일 때만 카운트 증가
            session.setRatedCount(session.getRatedCount() + 1);
        }

        // 목표 개수에 도달하면 세션 종료
        if (session.getRatedCount() >= session.getTargetCount()) {
            session.setStatus(QuickMatchSession.SessionStatus.COMPLETED);
            session.setCompletedAt(LocalDateTime.now());
        }

        return sessionRepository.save(session);
    }

    /**
     * 5) 퀵매치 결과 조회 (요약 + 추천 영화 리스트)
     */
    @Transactional(readOnly = true)
    public QuickMatchResultResponse getResult(String sessionId) {

        // 1) 세션 & 피드백 조회
        QuickMatchSession session = getSession(sessionId);

        List<QuickMatchFeedback> feedbacks =
                feedbackRepository.findBySessionId(sessionId);

        if (feedbacks.isEmpty()) {
            throw new IllegalStateException("해당 세션에 저장된 피드백이 없습니다.");
        }

        long likedCount = feedbacks.stream()
                .filter(f -> f.getAction() == QuickMatchFeedback.Action.LIKE)
                .count();

        long dislikedCount = feedbacks.stream()
                .filter(f -> f.getAction() == QuickMatchFeedback.Action.DISLIKE)
                .count();

        // 2) LIKE 된 영화들만 모아서 ES에서 상세 정보 조회
        List<QuickMatchFeedback> likedFeedbacks = feedbacks.stream()
                .filter(f -> f.getAction() == QuickMatchFeedback.Action.LIKE)
                .toList();

        List<Movie> likedMovies = new ArrayList<>();
        for (QuickMatchFeedback fb : likedFeedbacks) {
            Movie movie = movieSearchService.getMovieById(fb.getMovieId());
            if (movie != null) {
                likedMovies.add(movie);
            }
        }

        // 3) 취향 요약 계산 (장르 / 연도대 / 평균 평점)
        PreferenceSummary pref = summarizePreferences(likedMovies);

        QuickMatchResultSummaryDto summaryDto = QuickMatchResultSummaryDto.builder()
                .likedCount((int) likedCount)
                .dislikedCount((int) dislikedCount)
                .topGenres(pref.topGenres)
                .preferredYearRange(pref.preferredYearRange != null ? pref.preferredYearRange : "알 수 없음")
                .preferredCountry(List.of("알 수 없음"))
                .preferredMood(List.of("알 수 없음"))
                .build();

        // 4) 추천 영화 뽑기
        List<String> seenMovieIds = feedbacks.stream()
                .map(QuickMatchFeedback::getMovieId)
                .distinct()
                .toList();

        List<QuickMatchRecommendationDto> recommendations =
                buildRecommendations(pref, seenMovieIds, summaryDto);

        return QuickMatchResultResponse.builder()
                .summary(summaryDto)
                .recommendations(recommendations)
                .build();
    }

    /**
     * 세션에서 LIKE한 영화들 기반으로 장르/연도/평점 취향 요약
     */
    private PreferenceSummary summarizePreferences(List<Movie> likedMovies) {

        if (likedMovies.isEmpty()) {
            return new PreferenceSummary(
                    List.of(),   // topGenres
                    List.of(),   // topGenreIds
                    null,        // preferredYearRange
                    null         // avgRating
            );
        }

        Map<Integer, Integer> genreCountMap = new HashMap<>();

        Integer minYear = null;
        Integer maxYear = null;

        double ratingSum = 0.0;
        int ratingCount = 0;

        for (Movie movie : likedMovies) {

            // 장르 집계
            List<Integer> genreIds = parseGenreIds(movie);
            for (Integer gid : genreIds) {
                genreCountMap.merge(gid, 1, Integer::sum);
            }

            // 연도 계산 (release_date: "YYYY-MM-DD" 가정)
            String rd = movie.getReleaseDate();
            if (rd != null && rd.length() >= 4) {
                try {
                    int year = Integer.parseInt(rd.substring(0, 4));
                    if (minYear == null || year < minYear) minYear = year;
                    if (maxYear == null || year > maxYear) maxYear = year;
                } catch (NumberFormatException ignore) {
                    // 무시
                }
            }

            // 평점 집계
            if (movie.getVoteAverage() != null) {
                ratingSum += movie.getVoteAverage();
                ratingCount++;
            }
        }

        int totalGenreCount = genreCountMap.values().stream()
                .mapToInt(Integer::intValue)
                .sum();

        // Top3 장르
        List<Map.Entry<Integer, Integer>> topGenreEntries = genreCountMap.entrySet().stream()
                .sorted((a, b) -> b.getValue() - a.getValue())
                .limit(3)
                .toList();

        List<QuickMatchGenrePreferenceDto> topGenres = topGenreEntries.stream()
                .map(e -> QuickMatchGenrePreferenceDto.builder()
                        .name(GENRE_NAME_MAP.getOrDefault(e.getKey(), "기타"))
                        .ratio(totalGenreCount == 0 ? 0.0 : (double) e.getValue() / totalGenreCount)
                        .build()
                ).toList();

        List<Integer> topGenreIds = topGenreEntries.stream()
                .map(Map.Entry::getKey)
                .toList();

        // 연도 구간 (요약용)
        String yearRange = null;
        if (minYear != null && maxYear != null) {
            if (minYear.equals(maxYear)) yearRange = minYear + "년";
            else yearRange = minYear + "~" + maxYear;
        }

        Double avgRating = null;
        if (ratingCount > 0) {
            avgRating = ratingSum / ratingCount;
        }

        return new PreferenceSummary(topGenres, topGenreIds, yearRange, avgRating);
    }

    /**
     * 취향 요약 계산 결과를 담는 내부용 클래스
     */
    private static class PreferenceSummary {
        private final List<QuickMatchGenrePreferenceDto> topGenres;
        private final List<Integer> topGenreIds;
        private final String preferredYearRange;
        private final Double avgRating;

        public PreferenceSummary(List<QuickMatchGenrePreferenceDto> topGenres,
                                 List<Integer> topGenreIds,
                                 String preferredYearRange,
                                 Double avgRating) {
            this.topGenres = topGenres;
            this.topGenreIds = topGenreIds;
            this.preferredYearRange = preferredYearRange;
            this.avgRating = avgRating;
        }
    }

    /**
     * ES Movie의 genreIds가 String / Integer 섞여 있을 수 있으므로
     * 안전하게 Integer 리스트로 변환
     */
    private List<Integer> parseGenreIds(Movie movie) {
        if (movie.getGenreIds() == null) return List.of();

        List<Integer> result = new ArrayList<>();

        for (Object raw : movie.getGenreIds()) {
            if (raw == null) continue;

            try {
                if (raw instanceof Integer i) {
                    result.add(i);
                } else if (raw instanceof Number n) {
                    result.add(n.intValue());
                } else if (raw instanceof String s) {
                    result.add(Integer.parseInt(s));
                }
            } catch (Exception ignore) {
                // 변환 안 되는 값은 무시
            }
        }

        return result;
    }

    /**
     * Movie → MovieDoc 변환 (MovieSearchService의 toMovieDoc와 동일 로직 복사)
     * history용 간단 버전
     */
    private MovieDoc toMovieDocSafe(Movie movie) {
        if (movie == null) return null;

        MovieDoc doc = new MovieDoc();
        doc.setMovieId(movie.getId());
        doc.setTitle(movie.getTitle());
        doc.setOverview(movie.getOverview());

        if (movie.getPosterPath() != null && !movie.getPosterPath().isEmpty()) {
            doc.setPosterUrl("https://image.tmdb.org/t/p/w500" + movie.getPosterPath());
        } else {
            doc.setPosterUrl(null);
        }

        doc.setVoteAverage(movie.getVoteAverage());
        doc.setReleaseDate(movie.getReleaseDate());
        doc.setIsNowPlaying(movie.getIsNowPlaying());
        doc.setRuntime(movie.getRuntime());
        doc.setCertification(movie.getCertification());
        doc.setOttProviders(movie.getOttProviders());
        doc.setOttLink(movie.getOttLink());

        doc.setGenreIds(parseGenreIds(movie));

        return doc;
    }

    /**
     * 제목으로 시리즈 키를 만들어서 동일 시리즈 판별에 사용
     */
    private String buildSeriesKey(String title) {
        if (title == null) return "";

        String t = title.toLowerCase();

        // (2002) 같은 연도 표기 제거
        t = t.replaceAll("\\(\\d{4}\\)", "");

        // 콜론(:) 뒤 부제 제거
        if (t.contains(":")) {
            t = t.split(":", 2)[0];
        }

        // 하이픈(-) 뒤 부제 제거
        if (t.contains(" - ")) {
            t = t.split(" - ", 2)[0];
        }

        // 특수문자 제거
        t = t.replaceAll("[^a-z0-9가-힣 ]", " ");
        t = t.replaceAll("\\s+", " ").trim();

        // 뒤에 붙은 숫자 제거 (예: "범죄도시 2")
        t = t.replaceAll("\\s+[0-9]+$", "");

        // 뒤에 붙은 로마 숫자 제거 (예: "rocky ii")
        t = t.replaceAll("(?i) (ii|iii|iv|v|vi|vii|viii|ix|x)$", "");

        t = t.replaceAll("\\s+", " ").trim();

        if (t.length() < 2) {
            return "";
        }

        return t;
    }

    /**
     * 두 영화가 같은 시리즈인지 대략적으로 판별
     */
    private boolean isSameSeries(MovieDoc a, MovieDoc b) {
        String ka = buildSeriesKey(a.getTitle());
        String kb = buildSeriesKey(b.getTitle());

        if (ka.isEmpty() || kb.isEmpty()) return false;

        if (ka.equals(kb)) return true;

        int minLen = Math.min(ka.length(), kb.length());
        if (minLen >= 4) {
            if (ka.startsWith(kb) || kb.startsWith(ka)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 장르 기반 "분위기 유사도" 체크
     * - 장르 교집합이 2개 이상이면 너무 비슷한 영화로 간주
     */
    private boolean isTooSimilar(MovieDoc a, MovieDoc b) {
        if (a.getGenreIds() == null || b.getGenreIds() == null) return false;

        List<Integer> ga = a.getGenreIds();
        List<Integer> gb = b.getGenreIds();

        long overlap = ga.stream().filter(gb::contains).count();

        return overlap >= 2;
    }

    /**
     * 특정 장르가 히스토리에서 5회 이상 등장했다면,
     * 그 장르가 포함된 후보는 잠시 제외
     */
    private boolean exceedGenreLimit(List<MovieDoc> history, MovieDoc candidate) {
        if (candidate.getGenreIds() == null) return false;

        Map<Integer, Integer> counter = new HashMap<>();

        for (MovieDoc m : history) {
            if (m.getGenreIds() == null) continue;
            for (Integer g : m.getGenreIds()) {
                counter.merge(g, 1, Integer::sum);
            }
        }

        for (Integer g : candidate.getGenreIds()) {
            if (counter.getOrDefault(g, 0) >= 5) {
                return true;
            }
        }

        return false;
    }

    /**
     * 이유 문구 생성 – 장르 중심, 연도/평점은 보조로 랜덤하게 섞기
     */
    private String buildReasonText(PreferenceSummary pref) {

        StringBuilder sb = new StringBuilder();

        // 1) 장르 문구 (메인)
        if (pref.topGenres != null && !pref.topGenres.isEmpty()) {

            String genreNames = pref.topGenres.stream()
                    .map(QuickMatchGenrePreferenceDto::getName)
                    .limit(2)
                    .collect(Collectors.joining(" / "));

            String pattern = GENRE_PATTERNS.get(RANDOM.nextInt(GENRE_PATTERNS.size()));
            sb.append(pattern.formatted(genreNames));
        }

        // 2) 연도(시기) 문구 – 있을 때 30% 정도 확률로만 사용
        boolean includeYear = pref.preferredYearRange != null && RANDOM.nextDouble() < 0.3;
        if (includeYear) {
            String pattern = YEAR_PATTERNS.get(RANDOM.nextInt(YEAR_PATTERNS.size()));
            if (sb.length() > 0) sb.append(" ");
            sb.append(pattern.formatted(pref.preferredYearRange));
        }

        // 3) 평점(품질) 문구 – 평균 평점 정보가 있을 때 60% 정도 확률 사용
        boolean includeRating = pref.avgRating != null && RANDOM.nextDouble() < 0.6;
        if (includeRating) {
            String pattern = RATING_PATTERNS.get(RANDOM.nextInt(RATING_PATTERNS.size()));
            if (sb.length() > 0) sb.append(" ");
            sb.append(pattern);
        }

        // 4) 아무 정보도 없을 때
        if (sb.length() == 0) {
            String pattern = DEFAULT_PATTERNS.get(RANDOM.nextInt(DEFAULT_PATTERNS.size()));
            sb.append(pattern);
        }

        return sb.toString();
    }

    /**
     * 취향 요약 + 이미 본 영화 ID 리스트 기반으로 추천 생성
     */
    private List<QuickMatchRecommendationDto> buildRecommendations(
            PreferenceSummary pref,
            List<String> seenMovieIds,
            QuickMatchResultSummaryDto summaryDto
    ) {
        MovieSearchRequest req = new MovieSearchRequest();

        req.setPage(0);
        req.setSize(120); // 넉넉하게 뽑아와서 Top N만 선택

        // 평점 기반 최소 필터 (취향 평균에서 약간만 낮게)
        float minRating = 6.5f;
        if (pref.avgRating != null) {
            float candidate = pref.avgRating.floatValue() - 0.7f;
            minRating = Math.max(5.5f, candidate);
            minRating = Math.min(7.8f, minRating);
        }
        req.setMinRating(minRating);

        // 장르 필터: 대표 장르 1개만 사용
        if (pref.topGenreIds != null && !pref.topGenreIds.isEmpty()) {
            req.setGenres(pref.topGenreIds.stream()
                    .limit(1)
                    .toList());
        }

        MovieSearchResponse resp = movieSearchService.search(req);

        // 🔹 1차로 후보 MovieDoc만 모아 둔다
        List<MovieDoc> selected = new ArrayList<>();

        for (MovieDoc doc : resp.getMovies()) {
            if (seenMovieIds.contains(doc.getMovieId())) continue;
            selected.add(doc);
            if (selected.size() >= 10) break;
        }

        // 🔹 추천이 너무 적으면(예: 5개 미만) 장르 필터 풀고 다시 채우기
        if (selected.size() < 5) {
            MovieSearchRequest fallbackReq = new MovieSearchRequest();
            fallbackReq.setPage(0);
            fallbackReq.setSize(120);
            fallbackReq.setMinRating(minRating);

            MovieSearchResponse fallbackResp = movieSearchService.search(fallbackReq);

            for (MovieDoc doc : fallbackResp.getMovies()) {

                if (seenMovieIds.contains(doc.getMovieId())) continue;

                boolean alreadyAdded = selected.stream()
                        .anyMatch(r -> r.getMovieId().equals(doc.getMovieId()));
                if (alreadyAdded) continue;

                selected.add(doc);
                if (selected.size() >= 10) break;
            }
        }

        if (selected.isEmpty()) {
            return List.of();
        }

        // 🔹 여기서 한 번만 AI 호출해서 reason 리스트 받아오기
        List<String> reasons = aiRecommendationService.generateReasons(summaryDto, selected);

        // 🔹 영화 + reason 매핑해서 DTO로 변환
        List<QuickMatchRecommendationDto> result = new ArrayList<>();

        for (int i = 0; i < selected.size(); i++) {
            MovieDoc doc = selected.get(i);
            String reason = (i < reasons.size() ? reasons.get(i)
                    : "당신의 취향과 장르 선호를 반영해 고른 추천 작품이에요.");

            result.add(
                    QuickMatchRecommendationDto.builder()
                            .movieId(doc.getMovieId())
                            .title(doc.getTitle())
                            .posterUrl(doc.getPosterUrl())
                            .reason(reason)
                            .build()
            );
        }

        return result;
    }

    /**
     * 퀵매치 후보에서 다음 영화 1개 선택
     * - 시리즈 중복 방지
     * - 최근 N개와 장르/분위기 과도 유사 방지
     * - 특정 장르 과다 노출 방지
     * - 규칙으로 걸러서 없으면 점진적으로 완화
     */
    private MovieDoc selectNextCandidate(
            List<MovieDoc> pool,
            List<MovieDoc> history
    ) {
        if (pool.isEmpty()) {
            throw new RuntimeException("후보 영화가 없습니다.");
        }

        // 1차 필터: 시리즈 중복 + 장르 과다 + 최근 유사도 모두 적용
        List<MovieDoc> filtered = pool.stream()
                .filter(m ->
                        history.stream().noneMatch(h -> isSameSeries(h, m)) &&
                                history.stream().noneMatch(h -> isTooSimilar(h, m)) &&
                                !exceedGenreLimit(history, m)
                )
                .toList();

        if (!filtered.isEmpty()) {
            return filtered.get(RANDOM.nextInt(filtered.size()));
        }

        // 2차 필터: 시리즈 중복만 막고, 나머지는 완화
        List<MovieDoc> weakFiltered = pool.stream()
                .filter(m ->
                        history.stream().noneMatch(h -> isSameSeries(h, m))
                )
                .toList();

        if (!weakFiltered.isEmpty()) {
            return weakFiltered.get(RANDOM.nextInt(weakFiltered.size()));
        }

        // 3차: 그래도 없으면 그냥 랜덤
        return pool.get(RANDOM.nextInt(pool.size()));
    }
}
