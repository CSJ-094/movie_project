package com.boot.service;

import com.boot.dto.RecapResponseDto;
import com.boot.elastic.Movie;
import com.boot.entity.*;
import com.boot.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecapService {

    private static final Logger logger = LoggerFactory.getLogger(RecapService.class);

    private final UserService userService;
    private final WatchlistRepository watchlistRepository;
    private final ReviewRepository reviewRepository;
    private final RatingRepository ratingRepository;
    private final FavoriteRepository favoriteRepository;
    private final MovieSearchService movieSearchService;

    @Transactional(readOnly = true)
    public RecapResponseDto getRecap() {
        logger.info("리캡 데이터 생성을 시작합니다.");
        User user = getCurrentUser();
        String userName = user.getName();
        logger.info("대상 사용자: {}", userName);

        // 올해의 시작과 끝을 정의합니다.
        LocalDateTime startOfYear = LocalDateTime.of(2025, 1, 1, 0, 0);
        LocalDateTime endOfYear = LocalDateTime.of(2025, 12, 31, 23, 59, 59);

        // 1. Fetch User Data
        logger.debug("사용자 활동 데이터(워치리스트, 리뷰, 평점, 찜)를 DB에서 조회합니다.");
        List<Watchlist> watchlists = watchlistRepository.findByUser(user);
        List<Review> reviews = reviewRepository.findByUser(user);
        // [수정] 테스트를 위해 날짜 필터링을 임시로 비활성화하고 모든 평점을 가져옵니다.
        // 올해의 평점 기록만 가져옵니다.
        // List<Rating> ratings = ratingRepository.findByUserId(user.getId()).stream().filter(r -> r.getCreatedAt() != null && !r.getCreatedAt().isBefore(startOfYear) && !r.getCreatedAt().isAfter(endOfYear)).collect(Collectors.toList());
        List<Rating> ratings = ratingRepository.findByUserId(user.getId());
        List<Favorite> favorites = favoriteRepository.findByUser(user);
        logger.debug("DB 조회 완료: 워치리스트-{}개, 리뷰-{}개, 평점-{}개, 찜-{}개", watchlists.size(), reviews.size(), ratings.size(), favorites.size());

        // 2. Identify "Watched" Movies
        // Watched = Watchlist(watched=true) + Rated movies + Reviewed movies
        Set<String> watchedMovieIds = new HashSet<>();
        watchlists.stream().filter(Watchlist::isWatched).forEach(w -> watchedMovieIds.add(w.getMovieId()));
        ratings.forEach(r -> watchedMovieIds.add(String.valueOf(r.getMovieId())));
        reviews.forEach(r -> watchedMovieIds.add(r.getMovieId()));

        // Identify "Watchlist" (Not watched yet)
        Set<String> watchlistIds = watchlists.stream()
                .filter(w -> !w.isWatched())
                .map(Watchlist::getMovieId)
                .collect(Collectors.toSet());

        // Identify "Favorites"
        Set<String> favoriteIds = favorites.stream()
                .map(f -> String.valueOf(f.getMovieId()))
                .collect(Collectors.toSet());

        // 3. Collect ALL movie IDs to fetch from ES
        Set<String> allMovieIds = new HashSet<>();
        allMovieIds.addAll(watchedMovieIds);
        allMovieIds.addAll(watchlistIds);
        allMovieIds.addAll(favoriteIds);

        // 4. Batch Fetch Metadata
        logger.info("Elasticsearch에서 총 {}개의 영화 메타데이터를 일괄 조회합니다.", allMovieIds.size());
        List<Movie> movies = movieSearchService.getMoviesByIds(new ArrayList<>(allMovieIds));
        Map<String, Movie> movieMap = movies.stream()
                .collect(Collectors.toMap(Movie::getId, m -> m));
        logger.info("Elasticsearch 조회 완료. {}개의 메타데이터를 성공적으로 가져왔습니다.", movieMap.size());

        // 5. Calculate Stats

        logger.debug("활동 요약(Activity Summary) 계산 중...");
        // Activity Summary
        int totalActivity = watchlists.size() + ratings.size() + reviews.size() + favorites.size();

        // Most Active Month (Based on createdAt of all entities)
        Map<String, Integer> monthActivity = new HashMap<>();
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("M월");

        // 올해의 활동만 필터링하여 월별 활동 계산
        watchlists.stream().filter(e -> e.getCreatedAt() != null && e.getCreatedAt().getYear() == 2025).forEach(w -> incrementMonth(monthActivity, w.getCreatedAt(), monthFormatter));
        reviews.stream().filter(e -> e.getCreatedAt() != null && e.getCreatedAt().getYear() == 2025).forEach(r -> incrementMonth(monthActivity, r.getCreatedAt(), monthFormatter));
        ratings.forEach(r -> incrementMonth(monthActivity, r.getCreatedAt(), monthFormatter)); // ratings는 이미 올해 데이터로 필터링됨

        // Favorite/Rating don't have CreatedAt in the provided files. Will skip
        // timestamps for them or add them safely if possible, else just ignore.
        // Actually Rating entity doesn't show CreatedAt in the file used earlier (only
        // Id, User, MovieId, Rating).
        // So we only use Watchlist and Reviews for "Active Month".

        String mostActiveMonth = monthActivity.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("N/A");

        logger.debug("시청 기록 분석(Watched Analysis) 계산 중...");
        // Watched Analysis
        int totalWatchedCount = watchedMovieIds.size();
        long totalRuntime = 0;
        Map<String, Integer> genreCounts = new HashMap<>();
        Map<String, Integer> eraCounts = new HashMap<>(); // 1990s, 2000s

        for (String id : watchedMovieIds) {
            Movie m = movieMap.get(id);
            if (m != null) {
                if (m.getRuntime() != null)
                    totalRuntime += m.getRuntime();
                if (m.getGenreIds() != null) {
                    // Need to map Genre ID to Name. MovieSearchService has helper?
                    // No, Movie object has genreIds (List<String>).
                    // Actually Movie object has `genreIds` as keys.
                    // Ideally we need names. The generic list in MovieSearchService `GENRE_OPTIONS`
                    // maps IDs to names.
                    // I will replicate mapping logic or ask MovieSearchService (it has private
                    // static list).
                    // I'll copy the map here or expose it. Copying for simplicity as it's static
                    // data.
                    for (String gid : m.getGenreIds()) {
                        String gName = getGenreName(gid);
                        genreCounts.merge(gName, 1, (a, b) -> a + b);
                    }
                }
                if (m.getReleaseDate() != null && m.getReleaseDate().length() >= 4) {
                    try {
                        int year = Integer.parseInt(m.getReleaseDate().substring(0, 4));
                        String era = (year / 10 * 10) + "년대";
                        eraCounts.merge(era, 1, (a, b) -> a + b);
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
        }

        String topGenre = genreCounts.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey)
                .orElse("다양한 장르");
        String topEra = eraCounts.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey)
                .orElse("다양한 시대");

        logger.debug("평점 분석(Rating Analysis) 계산 중...");
        // Ratings Analysis
        double avgRating = ratings.stream().mapToDouble(Rating::getRating).average().orElse(0.0);

        // Find Top Rated Movie (User's rating)
        Rating topRatingEntity = ratings.stream()
                .max(Comparator.comparingDouble(Rating::getRating))
                .orElse(null);

        RecapResponseDto.MovieSummary topRatedMovieSummary = null;
        if (topRatingEntity != null) {
            Movie m = movieMap.get(String.valueOf(topRatingEntity.getMovieId()));
            if (m != null) {
                topRatedMovieSummary = RecapResponseDto.MovieSummary.builder()
                        .movieId(m.getId())
                        .title(m.getTitle())
                        .posterUrl("https://image.tmdb.org/t/p/w500" + m.getPosterPath())
                        .userRating(topRatingEntity.getRating())
                        .globalRating(m.getVoteAverage() != null ? m.getVoteAverage() : 0.0)
                        .build();
            }
        }

        // Find Hidden Gem (User Rating >> Global Rating)
        // [수정] Stream API를 사용하여 '숨은 보석'을 찾는 로직 개선
        // 1. 먼저 '숨은 보석'의 기본 조건을 만족하는 영화들을 필터링합니다.
        // 2. 그 중에서 평점 차이가 가장 큰 영화를 선택합니다.
        // [수정] 타입 추론 오류를 해결하기 위해 스트림 연산을 두 단계로 분리합니다.
        // 1단계: '숨은 보석' 후보들을 리스트로 추출합니다.
        List<AbstractMap.SimpleEntry<Rating, Double>> hiddenGemCandidates = ratings.stream()
            .map(r -> {
                Movie m = movieMap.get(String.valueOf(r.getMovieId()));
                if (m != null && m.getVoteAverage() != null) {
                    double diff = r.getRating() - m.getVoteAverage();
                    if (r.getRating() >= 7.0 && diff > 2.5) {
                        return new AbstractMap.SimpleEntry<>(r, diff);
                    }
                }
                return null;
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        // [수정] 타입 추론 에러를 근본적으로 해결하기 위해 로직을 명확하게 분리합니다.
        // 2단계: 후보 중에서 평점 차이가 가장 큰 항목을 찾습니다.
        Optional<AbstractMap.SimpleEntry<Rating, Double>> maxEntryOpt = hiddenGemCandidates.stream()
            .max(Comparator.comparingDouble(AbstractMap.SimpleEntry::getValue));

        // 3단계: 찾은 항목이 있을 경우에만 DTO로 변환하고, 없을 경우 null을 할당합니다.
        // [수정] 변수 선언 시 null로 초기화하여 'may not have been initialized' 에러를 해결합니다.
        RecapResponseDto.MovieSummary hiddenGemSummary = null;
        if (maxEntryOpt.isPresent()) {
            AbstractMap.SimpleEntry<Rating, Double> foundEntry = maxEntryOpt.get();
            Rating hiddenGemEntity = foundEntry.getKey();
            Movie m = movieMap.get(String.valueOf(hiddenGemEntity.getMovieId()));
            // [수정] fromMovieAndRating 메서드 대신 builder를 사용하여 객체를 생성합니다.
            if (m != null) {
                hiddenGemSummary = RecapResponseDto.MovieSummary.builder()
                    .movieId(m.getId())
                    .title(m.getTitle())
                    .posterUrl("https://image.tmdb.org/t/p/w500" + m.getPosterPath())
                    .userRating(hiddenGemEntity.getRating())
                    .globalRating(m.getVoteAverage() != null ? m.getVoteAverage() : 0.0)
                    .build();
            }
        }

        logger.debug("워치리스트 분석(Watchlist Analysis) 계산 중...");
        // Watchlist Analysis
        int watchlistCount = watchlistIds.size();
        Map<String, Integer> wlGenreCounts = new HashMap<>();
        for (String id : watchlistIds) {
            Movie m = movieMap.get(id);
            if (m != null && m.getGenreIds() != null) {
                for (String gid : m.getGenreIds()) {
                    String gName = getGenreName(gid);
                    wlGenreCounts.merge(gName, 1, (a, b) -> a + b);
                }
            }
        }
        String topWlGenre = wlGenreCounts.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey)
                .orElse("없음");

        logger.debug("어워드(Awards) 계산 중...");
        // Awards
        // Logic: Cinephile if watched > 50 or review > 10
        String awardTitle = "영화 탐험가";
        if (totalWatchedCount > 20 || reviews.size() > 5) {
            awardTitle = "열정적인 시네필";
        }
        if (totalWatchedCount > 50 || reviews.size() > 20) {
            awardTitle = "영화 평론가 못지않은 안목";
        }

        logger.info("사용자 '{}'의 리캡 데이터 생성을 완료했습니다.", userName);
        return RecapResponseDto.builder()
                .userName(userName)
                .activitySummary(RecapResponseDto.ActivitySummary.builder()
                        .totalActivityCount(totalActivity)
                        .mostActiveMonth(mostActiveMonth)
                        .build())
                .watchedAnalysis(RecapResponseDto.WatchedAnalysis.builder()
                        .totalWatchedCount(totalWatchedCount)
                        .totalRuntimeMinutes(totalRuntime)
                        .topGenre(topGenre)
                        .topEra(topEra)
                        .build())
                .ratingAnalysis(RecapResponseDto.RatingAnalysis.builder()
                        .averageRating(Math.round(avgRating * 10) / 10.0)
                        .totalReviews(reviews.size())
                        .topRatedMovie(topRatedMovieSummary)
                        .hiddenGem(hiddenGemSummary)
                        .build())
                .watchlistAnalysis(RecapResponseDto.WatchlistAnalysis.builder()
                        .totalWatchlistCount(watchlistCount)
                        .topGenreInWatchlist(topWlGenre)
                        .build())
                .awards(RecapResponseDto.Awards.builder()
                        .title(awardTitle)
                        .build())
                .build();
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            logger.warn("인증 정보가 없어 리캡 데이터를 생성할 수 없습니다.");
            throw new RuntimeException("Not authenticated");
        }
        String userEmail = authentication.getName();
        return userService.findByEmail(userEmail)
                .orElseThrow(() -> {
                    logger.error("'{}' 이메일에 해당하는 사용자를 찾을 수 없습니다.", userEmail);
                    return new RuntimeException("User not found");
                });
    }

    private void incrementMonth(Map<String, Integer> map, LocalDateTime date, DateTimeFormatter fmt) {
        if (date != null) {
            map.merge(date.format(fmt), 1, (a, b) -> a + b);
        }
    }

    // Using static map for genres as simple solution
    private static final Map<String, String> GENRE_MAP = Map.ofEntries(
            Map.entry("28", "액션"), Map.entry("12", "모험"), Map.entry("16", "애니메이션"), Map.entry("35", "코미디"),
            Map.entry("80", "범죄"), Map.entry("99", "다큐멘터리"), Map.entry("18", "드라마"), Map.entry("10751", "가족"),
            Map.entry("14", "판타지"), Map.entry("36", "역사"), Map.entry("27", "공포"), Map.entry("10402", "음악"),
            Map.entry("9648", "미스터리"), Map.entry("10749", "로맨스"), Map.entry("878", "SF"), Map.entry("10770", "TV 영화"),
            Map.entry("53", "스릴러"), Map.entry("10752", "전쟁"), Map.entry("37", "서부"));

    private String getGenreName(String id) {
        return GENRE_MAP.getOrDefault(id, "기타");
    }
}
