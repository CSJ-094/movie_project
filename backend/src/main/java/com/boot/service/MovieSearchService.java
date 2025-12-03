package com.boot.service;

import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Service;

import com.boot.dto.MovieDoc;
import com.boot.dto.MovieSearchRequest;
import com.boot.dto.MovieSearchResponse;
import com.boot.elastic.Movie;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.FieldValue;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.FieldValueFactorModifier;
import co.elastic.clients.elasticsearch._types.query_dsl.FunctionBoostMode;
import co.elastic.clients.elasticsearch._types.query_dsl.FunctionScoreMode;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;
import co.elastic.clients.json.JsonData;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MovieSearchService {

    private final ElasticsearchClient elasticsearchClient;

    public MovieSearchResponse search(MovieSearchRequest request) {

        int page = request.getPage() == null ? 0  : request.getPage();
        int size = request.getSize() == null ? 20 : request.getSize();
        int from = page * size;

        // 1. bool query 조립
        BoolQuery.Builder bool = new BoolQuery.Builder();

        // (1) 키워드 검색: title
        if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
            String keyword = request.getKeyword();

            // 제목에 keyword가 매칭되는 영화만 검색
            bool.must(m -> m
                    .match(mt -> mt
                            .field("title")
                            .query(keyword)
                    )
            );
        }

        // (2) nowPlaying 필터
        if (request.getNowPlaying() != null) {
            bool.filter(f -> f
                    .term(t -> t
                            .field("is_now_playing")
                            .value(request.getNowPlaying())
                    )
            );
        }

        // (3) 장르 필터 → ES 필드명: genre_ids
        if (request.getGenres() != null && !request.getGenres().isEmpty()) {
            bool.filter(f -> f
                    .terms(t -> t
                            .field("genre_ids")
                            .terms(v -> v.value(
                                    request.getGenres().stream()
                                            .map(FieldValue::of)
                                            .toList()
                            ))
                    )
            );
        }

        // (4) 최소 평점 → vote_average
        if (request.getMinRating() != null) {
            bool.filter(f -> f
                    .range(r -> r
                            .field("vote_average")
                            .gte(JsonData.of(request.getMinRating()))   // Float → JsonData
                    )
            );
        }

        // (5) 개봉일 범위 → release_date
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
                    })
            );
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
                                                            .missing(1.0)
                                                    )
                                                    .weight(1.2)
                                            )
                                            .scoreMode(FunctionScoreMode.Sum)
                                            .boostMode(FunctionBoostMode.Sum)
                                    )
                            ),
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

    private MovieDoc toMovieDoc(Movie movie) {
        if (movie == null) return null;

        MovieDoc doc = new MovieDoc();
        doc.setMovieId(movie.getId());
        doc.setTitle(movie.getTitle());
        doc.setOverview(movie.getOverview());
        doc.setPosterUrl(movie.getPosterPath());
        doc.setVoteAverage(movie.getVoteAverage());
        doc.setReleaseDate(movie.getReleaseDate());
        doc.setIsNowPlaying(movie.getIsNowPlaying());
        return doc;
    }
}
