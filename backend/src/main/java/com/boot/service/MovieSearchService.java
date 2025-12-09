package com.boot.service;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.FieldValue;
import co.elastic.clients.elasticsearch._types.aggregations.StatsAggregate;
import co.elastic.clients.elasticsearch._types.query_dsl.*;
import co.elastic.clients.elasticsearch.core.GetResponse;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;
import co.elastic.clients.json.JsonData;
import com.boot.dto.*;
import com.boot.dto.AutocompleteResponse.Item;
import com.boot.elastic.Movie;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class MovieSearchService {
    private static final Logger logger = LoggerFactory.getLogger(MovieSearchService.class);

    private final ElasticsearchClient elasticsearchClient;

    private static final List<GenreOption> GENRE_OPTIONS = List.of(
            new GenreOption(28, "액션"),
            new GenreOption(12, "모험"),
            new GenreOption(16, "애니메이션"),
            new GenreOption(35, "코미디"),
            new GenreOption(80, "범죄"),
            new GenreOption(99, "다큐멘터리"),
            new GenreOption(18, "드라마"),
            new GenreOption(10751, "가족"),
            new GenreOption(14, "판타지"),
            new GenreOption(36, "역사"),
            new GenreOption(27, "공포"),
            new GenreOption(10402, "음악"),
            new GenreOption(9648, "미스터리"),
            new GenreOption(10749, "로맨스"),
            new GenreOption(878, "SF"),
            new GenreOption(10770, "TV 영화"),
            new GenreOption(53, "스릴러"),
            new GenreOption(10752, "전쟁"),
            new GenreOption(37, "서부"));

    public MovieSearchResponse search(MovieSearchRequest request) {
        int page = request.getPage();
        int size = request.getSize();
        int from = page * size;

        BoolQuery.Builder bool = new BoolQuery.Builder();

        if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
            String keyword = request.getKeyword();
            bool.must(m -> m
                    .multiMatch(mt -> mt
                            .fields("title", "title.ngram", "companies")
                            .query(keyword)
                            .operator(Operator.And)));
        }
        if (request.getNowPlaying() != null) {
            bool.filter(f -> f
                    .term(t -> t
                            .field("is_now_playing")
                            .value(request.getNowPlaying())));
        }
        if (request.getGenres() != null && !request.getGenres().isEmpty()) {
            bool.filter(f -> f
                    .terms(t -> t
                            .field("genre_ids")
                            .terms(v -> v.value(
                                    request.getGenres().stream()
                                            .map(FieldValue::of)
                                            .toList()))));
        }
        if (request.getMinRating() != null) {
            bool.filter(f -> f
                    .range(r -> r
                            .field("vote_average")
                            .gte(JsonData.of(request.getMinRating()))
                    ));
        }
        if (request.getReleaseDateFrom() != null || request.getReleaseDateTo() != null) {
            bool.filter(f -> f
                    .range(r -> {
                        var builder = r.field("release_date");
                        if (request.getReleaseDateFrom() != null) {
                            builder.gte(JsonData.of(request.getReleaseDateFrom().toString()));
                        }
                        if (request.getReleaseDateTo() != null) {
                            builder.lte(JsonData.of(request.getReleaseDateTo().toString()));
                        }
                        return builder;
                    }));
        }

        try {
            SearchResponse<Movie> response = elasticsearchClient.search(s -> s
                            .index("movies")
                            .from(from)
                            .size(size)
                            .query(q -> q
                                    .functionScore(fs -> fs
                                            .query(q2 -> q2.bool(bool.build()))
                                            .functions(f -> f
                                                    .fieldValueFactor(fvf -> fvf
                                                            .field("vote_average")
                                                            .factor(1.2)
                                                            .modifier(FieldValueFactorModifier.Log1p)
                                                            .missing(1.0))
                                                    .weight(1.2))
                                            .scoreMode(FunctionScoreMode.Sum)
                                            .boostMode(FunctionBoostMode.Sum))),
                    Movie.class);

            long totalHits = response.hits().total() != null ? response.hits().total().value() : 0L;

            List<MovieDoc> docs = response.hits().hits().stream()
                    .map(Hit::source)
                    .filter(Objects::nonNull)
                    .map(this::toMovieDoc)
                    .toList();

            return MovieSearchResponse.builder()
                    .totalHits(totalHits)
                    .page(page)
                    .size(size)
                    .movies(docs)
                    .build();

        } catch (Exception e) {
            logger.error("Elasticsearch 검색 오류. 요청: {}", request, e);
            throw new RuntimeException("영화 검색 중 오류 발생: " + e.getMessage(), e);
        }
    }

    public AutocompleteResponse autocomplete(AutocompleteRequest request) {
        String keyword = request.getKeyword() == null ? "" : request.getKeyword().trim();
        int size = (request.getSize() == null || request.getSize() <= 0) ? 10 : request.getSize();

        if (keyword.isBlank()) {
            return AutocompleteResponse.builder().items(List.of()).build();
        }

        try {
            SearchResponse<Movie> response = elasticsearchClient.search(s -> s
                            .index("movies")
                            .size(size)
                            .query(q -> q
                                    .match(m -> m
                                            .field("title.ngram")
                                            .query(keyword)
                                            .operator(Operator.And))),
                    Movie.class);

            List<Item> items = response.hits().hits().stream()
                    .map(Hit::source)
                    .filter(Objects::nonNull)
                    .map(movie -> Item.builder()
                            .movieId(movie.getId())
                            .title(movie.getTitle())
                            .releaseDate(movie.getReleaseDate())
                            .build())
                    .toList();

            return AutocompleteResponse.builder().items(items).build();

        } catch (Exception e) {
            throw new RuntimeException("자동완성 검색 중 오류 발생", e);
        }
    }

    public FilterOptionsResponse getFilterOptions() {
        Double minRating = 0.0;
        Double maxRating = 10.0;

        try {
            SearchResponse<Void> response = elasticsearchClient.search(s -> s
                            .index("movies")
                            .size(0)
                            .aggregations("rating_stats", a -> a
                                    .stats(st -> st.field("vote_average"))),
                    Void.class);

            StatsAggregate stats = response.aggregations().get("rating_stats").stats();

            if (stats != null) {
                double minValue = stats.min();
                double maxValue = stats.max();
                if (!Double.isNaN(minValue) && !Double.isInfinite(minValue)) {
                    minRating = minValue;
                }
                if (!Double.isNaN(maxValue) && !Double.isInfinite(maxValue)) {
                    maxRating = maxValue;
                }
            }
        } catch (Exception e) {
            logger.error("필터 옵션 조회 중 오류 발생", e);
        }

        return FilterOptionsResponse.builder()
                .genres(GENRE_OPTIONS)
                .minRating(minRating)
                .maxRating(maxRating)
                .build();
    }

    public Movie getMovieById(String id) {
        try {
            GetResponse<Movie> response = elasticsearchClient.get(g -> g
                            .index("movies")
                            .id(id),
                    Movie.class);

            if (response.found()) {
                return response.source();
            } else {
                logger.warn("Elasticsearch에서 영화 ID {}를 찾을 수 없습니다.", id);
                return null;
            }
        } catch (Exception e) {
            logger.error("Elasticsearch에서 영화 ID {} 조회 중 오류 발생", id, e);
            return null;
        }
    }

    public List<Movie> getMoviesByIds(List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        try {
            SearchResponse<Movie> response = elasticsearchClient.search(s -> s
                            .index("movies")
                            .size(ids.size())
                            .query(q -> q
                                    .ids(i -> i
                                            .values(ids))),
                    Movie.class);

            return response.hits().hits().stream()
                    .map(Hit::source)
                    .filter(Objects::nonNull)
                    .toList();
        } catch (Exception e) {
            logger.error("Elasticsearch에서 다수 영화 조회 중 오류 발생", e);
            return List.of();
        }
    }
    public List<MovieDoc> findPopularMovies(int size) {
        MovieSearchRequest req = new MovieSearchRequest();
        req.setPage(0);
        req.setSize(size);
        MovieSearchResponse resp = search(req);
        return resp.getMovies();
    }

    private MovieDoc toMovieDoc(Movie movie) {
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

        return doc;
    }
}
