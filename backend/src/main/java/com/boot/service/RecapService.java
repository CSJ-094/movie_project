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

        // 1. Fetch User Data
        logger.debug("사용자 활동 데이터(워치리스트, 리뷰, 평점, 찜)를 DB에서 조회합니다.");
        List<Watchlist> watchlists = watchlistRepository.findByUser(user);
        List<Review> reviews = reviewRepository.findByUser(user);
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

        watchlists.forEach(w -> incrementMonth(monthActivity, w.getCreatedAt(), monthFormatter));
        reviews.forEach(r -> incrementMonth(monthActivity, r.getCreatedAt(), monthFormatter));
        // Rating/Favorite don't have CreatedAt in some simple implementations, need to
        // check entity.
        // Assuming Rating/Favorite has audit (EntityListeners).
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
        Rating hiddenGemEntity = null;
        double maxDiff = -1.0;

        for (Rating r : ratings) {
            Movie m = movieMap.get(String.valueOf(r.getMovieId()));
            if (m != null && m.getVoteAverage() != null) {
                double diff = r.getRating() * 2 - m.getVoteAverage(); // User is 5.0 scale, TMDB is 10.0 scale?
                // Wait, Rating entity comment says "0.5 ~ 5.0". ES Movie vote_average is
                // usually 0-10.
                // So UserRating * 2 to match scale.
                if (diff > maxDiff) {
                    maxDiff = diff;
                    hiddenGemEntity = r;
                }
            }
        }

        RecapResponseDto.MovieSummary hiddenGemSummary = null;
        if (hiddenGemEntity != null && maxDiff > 1.0) { // Only if significantly higher
            Movie m = movieMap.get(String.valueOf(hiddenGemEntity.getMovieId()));
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