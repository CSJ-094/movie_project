package com.boot.service;

import java.time.LocalDate;
import java.util.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch._types.aggregations.StatsAggregate;
import co.elastic.clients.elasticsearch._types.query_dsl.*;
import co.elastic.clients.elasticsearch.core.GetResponse;
import co.elastic.clients.elasticsearch.core.search.Suggestion; // Corrected import for Suggestion
import co.elastic.clients.elasticsearch._types.SuggestMode; // Corrected import for SuggestMode

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
import org.slf4j.Logger; // Logger import 추가
import org.slf4j.LoggerFactory; // LoggerFactory import 추가

import com.boot.dto.MovieDoc;
import com.boot.dto.MovieSearchRequest;
import com.boot.dto.MovieSearchResponse;

@Service
@RequiredArgsConstructor
public class MovieSearchService {
    private static final Logger logger = LoggerFactory.getLogger(MovieSearchService.class); // Logger 인스턴스 생성

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

    public List<MovieDoc> getWideCandidatePool() {
        try {
            // 퀵매치 후보: 유명하고, 어느 정도 인기 있고, 성인 영화는 제외
            SearchResponse<Movie> response = elasticsearchClient.search(s -> s
                            .index("movies")
                            .size(8000) // 넉넉하게 3000개 정도까지
                            .query(q -> q
                                    .bool(b -> b
                                            // 1) 최소 평가 수: 듣보잡 X
                                            .filter(f -> f.range(r -> r
                                                    .field("vote_count")
                                                    .gte(JsonData.of(300)) // 필요하면 300, 800 이런 식으로 조절 가능
                                            ))
                                            // 2) 최소 인기도: 너무 묻힌 영화 X
                                            .filter(f -> f.range(r -> r
                                                    .field("popularity")
                                                    .gte(JsonData.of(5))
                                            ))
                                            // 3) 성인 영화 제외
                                            .filter(f -> f.term(t -> t
                                                    .field("adult")
                                                    .value(false)
                                            ))
                                            // 4) 포스터 없는거 제외
                                            .filter(f -> f.exists(e -> e
                                                    .field("poster_path")))
                                    )
                            )
                            // 평가 수 많은 순 + 인기도 순으로 정렬
                            .sort(sort -> sort
                                    .field(f -> f
                                            .field("vote_count")
                                            .order(SortOrder.Desc)
                                    )
                            )
                            .sort(sort -> sort
                                    .field(f -> f
                                            .field("popularity")
                                            .order(SortOrder.Desc)
                                    )
                            ),
                    Movie.class
            );

            return response.hits().hits().stream()
                    .map(Hit::source)
                    .filter(Objects::nonNull)
                    .map(this::toMovieDoc)
                    .toList();

        } catch (Exception e) {
            logger.error("퀵매치 후보 로딩 중 오류 발생: {}", e.getMessage(), e);
            throw new RuntimeException("퀵매치 후보 로딩 실패: " + e.getMessage(), e);
        }
    }


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
            // 제목/줄거리/회사에 keyword가 매칭되는 영화만 검색
            bool.must(m -> m
                    .multiMatch(mt -> mt
                            .fields("title", "title.ngram", "companies"/* ,"overview" */)
                            .query(keyword)
                            .operator(Operator.Or))); // Operator.And -> Operator.Or로 변경
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
        // 별점 참여 투표수
        if (request.getVoteCount() != null) {
            bool.filter(f -> f
                    .range(r -> r
                            .field("vote_count")
                            .gte(JsonData.of(request.getVoteCount()))
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
        //성인여부
        if (!request.isAdult()) {
            bool.mustNot(mn -> mn
                    .terms(t -> t
                            .field("certification")
                            .terms(v -> v.value(List.of(
                                    FieldValue.of("18"),
                                    FieldValue.of("19+"),
                                    FieldValue.of("19"),
                                    FieldValue.of("청소년관람불가")
                            )))
                    )
            );
        }


        try {
            // BoolQuery 빌더를 한 번만 빌드하여 재사용합니다.
            Query builtBoolQuery = bool.build()._toQuery(); // BoolQuery.Builder에서 Query 객체로 변환

            // 디버깅을 위해 생성된 Query를 로깅
            logger.debug("Elasticsearch Query: {}", builtBoolQuery.toString());

            // 2. 검색 요청 빌드 (정렬 조건에 따라 분기)
            SearchResponse<Movie> response = elasticsearchClient.search(s -> {
                var searchBuilder = s.index("movies").from(from).size(size);

                // 정렬 조건이 있을 경우, 해당 기준으로 정렬
                if (request.getSortBy() != null && !request.getSortBy().isBlank()) {
                    SortOrder order = "asc".equalsIgnoreCase(request.getSortOrder()) ? SortOrder.Asc : SortOrder.Desc;
                    searchBuilder.query(builtBoolQuery)
                            .sort(sort -> sort.field(f -> f.field(request.getSortBy()).order(order)));
                } else {
                    // 정렬 조건이 없으면, 기존의 function_score 쿼리 사용
                    searchBuilder.query(q -> q
                            .functionScore(fs -> fs
                                    .query(builtBoolQuery)
                                    .functions(f -> f
                                            .fieldValueFactor(fvf -> fvf
                                                    .field("vote_average")
                                                    .factor(1.2)
                                                    .modifier(FieldValueFactorModifier.Log1p)
                                                    .missing(1.0))
                                            .weight(1.2))
                                    .scoreMode(FunctionScoreMode.Sum)
                                    .boostMode(FunctionBoostMode.Sum)
                            )
                    );
                }
                return searchBuilder;
            }, Movie.class);

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
            logger.error("Elasticsearch 검색 중 오류 발생. 요청: {}, 에러: {}", request, e.getMessage(), e); // 상세 로깅
            throw new RuntimeException("영화 검색 중 오류 발생: " + e.getMessage(), e);
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
                                    .stats(st -> st.field("vote_average"))),
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
                .genres(GENRE_OPTIONS) // 🔹 여기서 매핑 리스트 내려줌
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
                logger.warn("Elasticsearch에서 영화 ID {}를 찾을 수 없습니다.", id); // 로그 추가
                return null;
            }
        } catch (Exception e) {
            logger.error("Elasticsearch에서 영화 ID {} 조회 중 오류 발생: {}", id, e.getMessage()); // 로그 추가
            return null;
        }
    }

    // 다수 영화 ID로 조회 (Recap 기능용)
    public List<Movie> getMoviesByIds(List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        try {
            SearchResponse<Movie> response = elasticsearchClient.search(s -> s
                            .index("movies")
                            .size(ids.size()) // 요청한 ID 개수만큼 조회
                            .query(q -> q
                                    .ids(i -> i
                                            .values(ids))),
                    Movie.class);

            return response.hits().hits().stream()
                    .map(Hit::source)
                    .filter(Objects::nonNull)
                    .toList();
        } catch (Exception e) {
            logger.error("Elasticsearch에서 다수 영화 조회 중 오류 발생: {}", e.getMessage());
            return List.of();
        }
    }

    // 퀵매치용 : 인기 + 평점 순으로 상위 N개의 영화 가져오기
    public List<MovieDoc> findPopularMovies(int size) {
        MovieSearchRequest req = new MovieSearchRequest();
        req.setPage(0);     // 처음에 0으로 설정
        req.setSize(size);  // 가져올 개수

        MovieSearchResponse resp = search(req);

        return resp.getMovies();
    }

    // MovieDetailPage 추천영화 섹션
    public List<MovieDoc> recommend(String movieId) {
        List<Movie> finalResults = new ArrayList<>();
        List<FieldValue> adultCerts = List.of(FieldValue.of("19"), FieldValue.of("18"), FieldValue.of("R"), FieldValue.of("Restricted"));
        int targetSize = 10; // 갯수

        // MLT(More Like This) 쿼리 사용 (유사도 기반)
        // 대표 키워드set을 가지고 리턴
        try {
            SearchResponse<Movie> mltResponse = elasticsearchClient.search(s -> s
                            .index("movies") //movies 인덱스에서 검색하여 targetSize만큼 가져오겠다.
                            .size(targetSize)
                            .query(q -> q
                                    .bool(b -> b
                                            .must(m -> m
                                                    .moreLikeThis(mlt -> mlt //MLT 필드 시작
                                                            .fields("overview", "title", "actors", "director", "companies") //유사도 분석 필드
                                                            .like(l -> l.document(d -> d.index("movies").id(movieId))) // 기준이 되는 항목 -> 현재 영화 id
                                                            .minTermFreq(1) // 기준 항목에서 [최소 1번] 이상 등장한 단어 사용
                                                            .minDocFreq(1) // DB에서 최소 1번 이상 등장해야 사용
                                                    )
                                            )
                                            .filter(f ->f.exists(e -> e.field("poster_path")))
                                            .mustNot(mn ->mn.terms(t -> t.field("certification").terms(v -> v.value(adultCerts))))
                                    )
                            ),
                    Movie.class
            );

            finalResults.addAll(mltResponse.hits().hits().stream()
                    .map(Hit::source)
                    .filter(Objects::nonNull)
                    .toList()); //추천 정보 저장

        } catch (Exception e) {
            logger.warn("MLT기반 추천중 오류 (ID: {}): {}", movieId, e.getMessage());
        }

        if (finalResults.size() < targetSize) { //추천 정보 갯수가 너무 적으면 ->
            try {
                // 현재 영화의 장르를 조회
                Movie currentMovie = getMovieById(movieId);

                if (currentMovie != null && currentMovie.getGenreIds() != null && !currentMovie.getGenreIds().isEmpty()) {
                    List<String> excludeIds = new ArrayList<>(); //리스트 생성
                    excludeIds.add(movieId); //현재 보고있는 영화와
                    finalResults.forEach(m -> excludeIds.add(m.getId())); //위에서 저장한 추천 정보들 excludeIds에 저장

                    int more = targetSize - finalResults.size(); //추가해야할 size 계산

                    SearchResponse<Movie> genreResponse = elasticsearchClient.search(s -> s
                                    .index("movies")
                                    .size(more)
                                    .query(q -> q
                                            .bool(b -> b
                                                    //같은 장르 기반 추천
                                                    .filter(f -> f
                                                            .terms(t -> t
                                                                    .field("genre_ids")
                                                                    .terms(v -> v.value(currentMovie.getGenreIds().stream()
                                                                            .map(FieldValue::of)
                                                                            .toList()))
                                                            )
                                                    )
                                                    .filter(f -> f
                                                            .exists(e -> e
                                                                    .field("poster_path"))
                                                    )

                                                    .mustNot(mn -> mn
                                                            .ids(i -> i.values(excludeIds)) //excludeIds에 있는 값은 추가 x
                                                    )
                                                    .mustNot(mn -> mn
                                                            .terms(t -> t
                                                                    .field("certification")
                                                                    .terms(v -> v.value(adultCerts))
                                                            )
                                                    )
                                            )
                                    )
                                    // 평점 높은 순으로 채우기
                                    .sort(sort -> sort.field(f -> f.field("vote_average").order(SortOrder.Desc)))
                            , Movie.class);

                    finalResults.addAll(genreResponse.hits().hits().stream()
                            .map(Hit::source)
                            .filter(Objects::nonNull)
                            .toList()); //추천 항목 리스트 추가
                }
            } catch (Exception e) {
                logger.error("장르기반 추천 중 오류: {}", e.getMessage());
            }
        }

        return finalResults.stream()
                .map(this::toMovieDoc)
                .toList();
    }

    // 4. 오타 교정 제안 (Suggester)
    public List<String> suggestKeywords(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return List.of();
        }

        try {
            SearchResponse<Void> response = elasticsearchClient.search(s -> s
                            .index("movies")
                            .suggest(su -> su
                                    .suggesters("title-suggester", ts -> ts // suggester 이름
                                            .text(keyword) // 제안을 받을 텍스트
                                            .term(t -> t
                                                    .field("title.keyword") // 제안을 생성할 필드
                                                    .suggestMode(SuggestMode.Always) // 항상 제안
                                                    .minDocFreq(1.0f) // 최소 문서 빈도
                                                    .prefixLength(1) // 접두사 길이
                                                    .maxEdits(2) // 최대 편집 거리 (오타 허용 범위)
                                                    .size(5) // 최대 제안 개수
                                            )
                                    )
                            ),
                    Void.class // 실제 문서가 필요 없으므로 Void.class 사용
            );

            // 제안 결과 파싱
            List<String> suggestions = new ArrayList<>();
            response.suggest().get("title-suggester").forEach(suggestion -> {
                // completion suggester 결과 처리 (현재는 term suggester만 사용하므로 이 부분은 필요 없을 수 있음)
                // if (suggestion.completion() != null) {
                //     suggestion.completion().options().forEach(option -> {
                //         suggestions.add(option.text());
                //     });
                // }
                if (suggestion.term() != null) { // term suggester 결과 처리
                    suggestion.term().options().forEach(option -> {
                        suggestions.add(option.text());
                    });
                }
            });
            return suggestions.stream().distinct().collect(Collectors.toList()); // 중복 제거
        } catch (Exception e) {
            logger.error("Elasticsearch 키워드 제안 중 오류 발생. 키워드: {}, 에러: {}", keyword, e.getMessage(), e);
            return List.of();
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

        if (movie.getGenreIds() != null) {
            List<Integer> gids = new ArrayList<>();
            for (Object raw : movie.getGenreIds()) {
                if (raw == null) continue;
                try {
                    if (raw instanceof Integer i) {
                        gids.add(i);
                    } else if (raw instanceof Number n) {
                        gids.add(n.intValue());
                    } else if (raw instanceof String s) {
                        gids.add(Integer.parseInt(s));
                    }
                } catch (Exception ignore) {
                    // 이상한 값은 무시
                }
            }
            doc.setGenreIds(gids);
        }

        return doc;
    }
}
