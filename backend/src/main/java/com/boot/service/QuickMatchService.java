package com.boot.service;

import com.boot.dto.*;
import com.boot.elastic.Movie;
import com.boot.entity.QuickMatchFeedback;
import com.boot.entity.QuickMatchSession;
import com.boot.repository.QuickMatchFeedbackRepository;
import com.boot.repository.QuickMatchSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuickMatchService {

    private final QuickMatchSessionRepository sessionRepository;
    private final QuickMatchFeedbackRepository feedbackRepository;
    private final MovieSearchService movieSearchService;

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
     * - MovieSearchService.findPopularMovies(N)으로 인기 영화 리스트 가져옴
     * - 이 세션에서 이미 평가한 영화(movieId)는 제외
     * - 남은 후보 중에서 랜덤으로 하나 선택
     */
    @Transactional(readOnly = true)
    public MovieDoc getNextMovie(String sessionId) {
        QuickMatchSession session = getSession(sessionId);

        // 이 세션에서 이미 평가한 영화들의 movieId (String)
        List<QuickMatchFeedback> feedbacks = feedbackRepository.findBySessionId(sessionId);
        List<String> alreadyMovieIds = feedbacks.stream()
                .map(QuickMatchFeedback::getMovieId)
                .toList();

        // 인기 상위 N개에서 후보 가져오기 (필요하면 200 → 500, 1000으로 조정 가능)
        List<MovieDoc> candidates = movieSearchService.findPopularMovies(200);

        // 이미 본 영화 제외
        List<MovieDoc> filtered = candidates.stream()
                .filter(m -> m.getMovieId() != null && !alreadyMovieIds.contains(m.getMovieId()))
                .toList();

        if (filtered.isEmpty()) {
            throw new RuntimeException("더 이상 보여줄 영화가 없습니다.");
        }

        // 랜덤으로 하나 선택
        return filtered.get(new Random().nextInt(filtered.size()));
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
            // movieId는 ES의 id 문자열이라고 가정
            Movie movie = movieSearchService.getMovieById(fb.getMovieId());
            if (movie != null) {
                likedMovies.add(movie);
            }
        }

        // 3) 취향 요약 계산 (장르 / 연도대)
        PreferenceSummary pref = summarizePreferences(likedMovies);

        QuickMatchResultSummaryDto summaryDto = QuickMatchResultSummaryDto.builder()
                .likedCount((int) likedCount)
                .dislikedCount((int) dislikedCount)
                .topGenres(pref.topGenres)
                .preferredYearRange(pref.preferredYearRange != null ? pref.preferredYearRange : "알 수 없음")
                .preferredCountry(List.of("알 수 없음"))  // 필드가 없으니 명시적으로 표시
                .preferredMood(List.of("알 수 없음"))     // 분위기도 마찬가지
                .build();

        // 4) 추천 영화 뽑기
        List<String> seenMovieIds = feedbacks.stream()
                .map(QuickMatchFeedback::getMovieId)
                .distinct()
                .toList();

        List<QuickMatchRecommendationDto> recommendations =
                buildRecommendations(pref, seenMovieIds);

        return QuickMatchResultResponse.builder()
                .summary(summaryDto)
                .recommendations(recommendations)
                .build();
    }

    // 세션에서 LIKE한 영화들 기반으로 장르/연도 취향 요약
    private PreferenceSummary summarizePreferences(List<Movie> likedMovies) {

        // 아무 것도 없으면 빈 결과
        if (likedMovies.isEmpty()) {
            return new PreferenceSummary(
                    List.of(),   // topGenres
                    List.of(),   // topGenreIds
                    null         // preferredYearRange
            );
        }

        // 1) 장르 카운트
        Map<Integer, Integer> genreCountMap = new HashMap<>();

        Integer minYear = null;
        Integer maxYear = null;

        for (Movie movie : likedMovies) {

            // 장르 ID 리스트 (List<String> 가정)
            if (movie.getGenreIds() != null) {
                for (String gidStr : movie.getGenreIds()) {
                    if (gidStr == null || gidStr.isBlank()) continue;

                    try {
                        Integer gid = Integer.valueOf(gidStr);
                        genreCountMap.merge(gid, 1, Integer::sum);
                    } catch (NumberFormatException ignore) {
                        // 숫자로 안 들어오는 쓰레기 값은 무시
                    }
                }
            }

            // 연도 계산 (release_date: "YYYY-MM-DD" 형식 가정)
            String rd = movie.getReleaseDate();
            if (rd != null && rd.length() >= 4) {
                try {
                    int year = Integer.parseInt(rd.substring(0, 4));
                    if (minYear == null || year < minYear) minYear = year;
                    if (maxYear == null || year > maxYear) maxYear = year;
                } catch (NumberFormatException ignore) {
                    // 쓰레기 데이터는 무시
                }
            }
        }

        // 장르 비율 계산용 총합
        int totalGenreCount = genreCountMap.values().stream()
                .mapToInt(Integer::intValue)
                .sum();

        // 많이 나온 순으로 정렬해서 상위 3개만 추출
        List<Map.Entry<Integer, Integer>> topGenreEntries = genreCountMap.entrySet().stream()
                .sorted((e1, e2) -> Integer.compare(e2.getValue(), e1.getValue())) // 많이 나온 순
                .limit(3)
                .toList();

        // DTO용 장르 정보
        List<QuickMatchGenrePreferenceDto> topGenres = topGenreEntries.stream()
                .map(e -> {
                    Integer genreId = e.getKey();
                    int count = e.getValue();
                    double ratio = totalGenreCount > 0
                            ? (double) count / totalGenreCount
                            : 0.0;

                    String name = GENRE_NAME_MAP.getOrDefault(genreId, "기타");

                    return QuickMatchGenrePreferenceDto.builder()
                            .name(name)
                            .ratio(ratio)
                            .build();
                })
                .toList();

        // 추천용 장르 ID 리스트
        List<Integer> topGenreIds = topGenreEntries.stream()
                .map(Map.Entry::getKey)
                .toList();

        // 연도 구간 문자열
        String yearRange = null;
        if (minYear != null && maxYear != null) {
            if (minYear.equals(maxYear)) {
                yearRange = minYear + "년";
            } else {
                yearRange = minYear + "~" + maxYear;
            }
        }

        return new PreferenceSummary(topGenres, topGenreIds, yearRange);
    }


    // 취향 요약 계산 결과를 담는 내부용 클래스
    private static class PreferenceSummary {
        private final List<QuickMatchGenrePreferenceDto> topGenres;
        private final List<Integer> topGenreIds;
        private final String preferredYearRange;

        public PreferenceSummary(List<QuickMatchGenrePreferenceDto> topGenres,
                                 List<Integer> topGenreIds,
                                 String preferredYearRange) {
            this.topGenres = topGenres;
            this.topGenreIds = topGenreIds;
            this.preferredYearRange = preferredYearRange;
        }
    }


    // ES Movie의 genreIds가 String / Integer 섞여 있을 수 있으므로
// 안전하게 Integer 리스트로 변환해 주는 메소드
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


    // 취향 요약 + 이미 본 영화 ID 리스트 기반으로 추천 생성
    private List<QuickMatchRecommendationDto> buildRecommendations(
            PreferenceSummary pref,
            List<String> seenMovieIds
    ) {
        // 1) 선호 장르 ID 가져오기
        List<Integer> genreIdsForSearch = pref.topGenreIds;

        // 2) ES 검색 조건 세팅
        MovieSearchRequest request = new MovieSearchRequest();
        request.setPage(0);
        request.setSize(80);         // 넉넉하게 뽑아 와서
        request.setMinRating(6.5f);  // 너무 낮은 평점은 컷

        // 선호 장르가 있으면 장르 필터 적용
        if (genreIdsForSearch != null && !genreIdsForSearch.isEmpty()) {
            request.setGenres(genreIdsForSearch);
        }

        // 연도 범위: 너무 넓으면 필터 안 걸고, 적당히 좁으면 필터 사용
        Integer fromYear = null;
        Integer toYear = null;

        if (pref.preferredYearRange != null && pref.preferredYearRange.contains("~")) {
            String[] tokens = pref.preferredYearRange.split("~");
            try {
                int minYear = Integer.parseInt(tokens[0]);
                int maxYear = Integer.parseInt(tokens[1]);

                int span = maxYear - minYear;

                // 예: 20년 이내 정도일 때만 필터로 사용
                if (span >= 0 && span <= 20) {
                    fromYear = minYear;
                    toYear = maxYear;
                    request.setReleaseDateFrom(java.time.LocalDate.of(minYear, 1, 1));
                    request.setReleaseDateTo(java.time.LocalDate.of(maxYear, 12, 31));
                }
            } catch (NumberFormatException ignore) {
                // 잘 안 맞으면 그냥 연도 필터는 건너뜀
            }
        }

        MovieSearchResponse searchResp = movieSearchService.search(request);

        // 3) 이 세션에서 이미 본 영화들은 제외 + 간단한 점수 계산(연도/평점 반영)
        List<QuickMatchRecommendationDto> result = new ArrayList<>();

        // reason 문구용 상위 장르 이름 (2개 정도만 사용)
        String topGenreNames = pref.topGenres.stream()
                .map(QuickMatchGenrePreferenceDto::getName)
                .limit(2)
                .collect(Collectors.joining("/"));

        for (MovieDoc doc : searchResp.getMovies()) {
            if (seenMovieIds.contains(doc.getMovieId())) {
                continue; // 이미 본 영화는 건너뜀
            }

            // 간단한 스코어링: 평점 + 연도 근접도
            double score = 0.0;

            if (doc.getVoteAverage() != null) {
                score += doc.getVoteAverage(); // 평점이 높을수록 우선
            }

            if (fromYear != null && toYear != null && doc.getReleaseDate() != null
                    && doc.getReleaseDate().length() >= 4) {
                try {
                    int year = Integer.parseInt(doc.getReleaseDate().substring(0, 4));
                    // 범위 안이면 약간의 보너스
                    if (year >= fromYear && year <= toYear) {
                        score += 0.5;
                    }
                } catch (NumberFormatException ignore) {
                    // 무시
                }
            }

            // 일단 DTO에 점수는 저장 안 하지만, 정렬을 위해 같이 들고 있다가 나중에 정렬해도 됨
            // 여기서는 간단하게 result에 추가만 해두고, 나중에 한 번 더 정렬

            String reason;
            if (topGenreNames != null && !topGenreNames.isBlank() && pref.preferredYearRange != null) {
                reason = "당신이 좋아요한 " + topGenreNames +
                        " 장르, " + pref.preferredYearRange + "대 영화와 비슷한 인기 작품입니다.";
            } else if (topGenreNames != null && !topGenreNames.isBlank()) {
                reason = "당신이 좋아요한 " + topGenreNames + " 장르와 비슷한 인기 영화입니다.";
            } else {
                reason = "당신이 좋아요한 영화와 비슷한 인기 영화입니다.";
            }

            QuickMatchRecommendationDto dto = QuickMatchRecommendationDto.builder()
                    .movieId(doc.getMovieId())
                    .title(doc.getTitle())
                    .posterUrl(doc.getPosterUrl())
                    .reason(reason)
                    .build();

            // 점수 정렬을 위해 함께 보관하고 싶다면 별도 래퍼 클래스를 쓰거나,
            // 여기서 바로 result에 넣고 나중에 평점 기준으로만 정렬해도 무방.
            result.add(dto);

            // 너무 많이 추천해도 의미 없으니 20개 이상이면 중단
            if (result.size() >= 20) {
                break;
            }
        }

        // 4) 평점 기준으로 한 번 정렬 후 상위 10개만 사용
        result.sort((a, b) -> {
            // MovieDoc이 아니라 DTO라 평점 정보는 없지만,
            // 지금은 ES에서 이미 평점/스코어 순으로 받아왔으니
            // 추가 정렬 없이 그대로 둬도 크게 문제는 없음.
            // 필요하면 QuickMatchRecommendationDto에 평점 필드를 추가해서 정렬.
            return 0;
        });

        // 최대 10개까지만 반환
        if (result.size() > 10) {
            return result.subList(0, 10);
        }

        return result;
    }
}
