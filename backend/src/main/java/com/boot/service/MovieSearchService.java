package com.boot.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import co.elastic.clients.elasticsearch._types.aggregations.StatsAggregate;
import co.elastic.clients.elasticsearch._types.query_dsl.*;
import co.elastic.clients.elasticsearch.core.GetResponse;

import com.boot.dto.*;
import com.boot.dto.AutocompleteResponse.Item;
import org.springframework.stereotype.Service;

import com.boot.elastic.Movie;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.FieldValue;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;
import co.elastic.clients.json.JsonData;
import lombok.RequiredArgsConstructor;

import com.boot.dto.MovieDoc;
import com.boot.dto.MovieSearchRequest;
import com.boot.dto.MovieSearchResponse;


@Service
@RequiredArgsConstructor
public class MovieSearchService {
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
            new GenreOption(37, "서부")
    );

    // 1. 메인 검색 API 로직
    public MovieSearchResponse search(MovieSearchRequest request) {
        int page = request.getPage();
        int size = request.getSize();
        int from = page * size;
        // 1. bool query 조립
        BoolQuery.Builder bool = new BoolQuery.Builder();
        // (1) 키워드 검색: title
        if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
            String keyword = request.getKeyword();
            // 제목에 keyword가 매칭되는 영화만 검색
            bool.must(m -> m
                    .multiMatch(mt -> mt
                            .fields("title","title.ngram", "companies"/*,"overview"*/)
                            .query(keyword)
                            .operator(Operator.And)));
        }
        // (2) nowPlaying 필터
        if (request.getNowPlaying() != null) {
            bool.filter(f -> f
                    .term(t -> t
                            .field("is_now_playing")
                            .value(request.getNowPlaying())));
        }
        // (3) 장르 필터 → ES 필드명: genre_ids
        if (request.getGenres() != null && !request.getGenres().isEmpty()) {
            bool.filter(f -> f
                    .terms(t -> t
                            .field("genre_ids")
                            .terms(v -> v.value(
                                    request.getGenres().stream()
                                            .map(FieldValue::of)
                                            .toList()))));
        }
        // (4) 최소 평점 → vote_average
        if (request.getMinRating() != null) {
            bool.filter(f -> f
                    .range(r -> r
                            .field("vote_average")
                            .gte(JsonData.of(request.getMinRating())) // Float → JsonData
                    ));
        }

        // (5) 개봉일 범위 → release_date
        if (request.getReleaseDateFrom() != null || request.getReleaseDateTo() != null) {
            bool.filter(f -> f
                    .range(r -> {
                        var builder = r.field("release_date");
                        if (request.getReleaseDateFrom() != null) {
                            builder.gte(JsonData
                                    .of(request.getReleaseDateFrom().toString()));
                        }
                        if (request.getReleaseDateTo() != null) {
                            builder.lte(JsonData.of(request.getReleaseDateTo().toString()));
                        }
                        return builder;
                    }));
        }

        try {
            // 2. function_score 쿼리 (지금은 평점 부스팅만 적용)
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

            long totalHits = response.hits().total() != null
                    ? response.hits().total().value()
                    : 0L;

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
            throw new RuntimeException("영화 검색 중 오류 발생", e);
        }
    }

    // 2.자동완성 API 로직
    public AutocompleteResponse autocomplete(AutocompleteRequest request) {

        // 1) keyword, size 정리
        String keyword = request.getKeyword() == null
                ? ""
                : request.getKeyword().trim();

        int size = (request.getSize() == null || request.getSize() <= 0)
                ? 10
                : request.getSize();

        // 키워드가 비어 있으면 ES까지 안 가고 그냥 빈 결과 반환
        if (keyword.isBlank()) {
            return AutocompleteResponse.builder()
                    .items(List.of())
                    .build();
        }

        try {
            // 2) ES 검색 요청
            SearchResponse<Movie> response = elasticsearchClient.search(s -> s
                            .index("movies")
                            .size(size)
                            .query(q -> q
                                    .match(m -> m
                                            .field("title.ngram")
                                            .query(keyword)
                                            .operator(Operator.And))),
                    Movie.class);

            // 3) 결과를 AutocompleteResponse.Item 리스트로 변환
            List<Item> items = response.hits().hits().stream()
                    .map(Hit::source)
                    .filter(Objects::nonNull)
                    .map(movie -> Item.builder()
                            .movieId(movie.getId())
                            .title(movie.getTitle())
                            .releaseDate(movie.getReleaseDate())
                            .build())
                    .toList();

            return AutocompleteResponse.builder()
                    .items(items)
                    .build();

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
                                    .stats(st -> st.field("vote_average"))
                            ),
                    Void.class);

            StatsAggregate stats = response.aggregations()
                    .get("rating_stats")
                    .stats();

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
            System.out.println("필터 옵션 조회 중 오류 발생: " + e.getMessage());
        }

        return FilterOptionsResponse.builder()
                .genres(GENRE_OPTIONS)   // 🔹 여기서 매핑 리스트 내려줌
                .minRating(minRating)
                .maxRating(maxRating)
                .build();
    }


    public Movie getMovieById(String id) {
        try {
            GetResponse<Movie> response = elasticsearchClient.get(g -> g
                            .index("movies")
                            .id(id),
                    Movie.class
            );

            if (response.found()) {
                return response.source();
            } else {
                return null;
            }
        } catch (Exception e) {
            // 로그를 남기는 것이 좋지만, 일단 null 반환
            e.printStackTrace();
            return null;
        }
    }

    // 3. 공통 변환 메서드
    private MovieDoc toMovieDoc(Movie movie) {
        if (movie == null)
            return null;

        MovieDoc doc = new MovieDoc();
        doc.setMovieId(movie.getId());
        doc.setTitle(movie.getTitle());
        doc.setOverview(movie.getOverview());

        // TMDB 이미지 URL 추가
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
