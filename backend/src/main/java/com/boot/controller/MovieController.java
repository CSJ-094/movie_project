package com.boot.controller;

import com.boot.dto.MovieDoc;
import java.time.LocalDate;

import com.boot.dto.MovieDoc;
import com.boot.dto.MovieSearchRequest;
import com.boot.dto.MovieSearchResponse;
import com.boot.service.UserService;
import com.boot.service.MovieSearchService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieSearchService movieSearchService;
    private final UserService userService;

    private boolean isAdult(UserDetails userDetails) {
        if(userDetails != null){
            return userService.findByEmail(userDetails.getUsername())
                    .map(user->user.getAge() >= 19)
                    .orElse(false);
        }
        return false;
    }

    // [추가] 반복되는 MovieSearchRequest 생성을 위한 헬퍼 메서드
    private MovieSearchRequest createMovieSearchRequest(Pageable pageable, UserDetails userDetails) {
        MovieSearchRequest request = new MovieSearchRequest();
        request.setPage(pageable.getPageNumber());
        request.setSize(pageable.getPageSize());
        request.setAdult(isAdult(userDetails));
        return request;
    }

    @Operation(summary = "인기 영화 목록 조회", description = "인기 있는 영화 목록을 페이지별로 조회합니다.")
    @GetMapping("/popular")
    public ResponseEntity<MovieSearchResponse> getPopularMovies(@PageableDefault(size = 20) Pageable pageable,
                                                                @AuthenticationPrincipal UserDetails userDetails) {
        MovieSearchRequest request = createMovieSearchRequest(pageable, userDetails);
        request.setSortBy("popularity");
        request.setSortOrder("desc");

        return ResponseEntity.ok(movieSearchService.search(request));
    }

    @Operation(summary = "현재 상영중인 영화 목록 조회", description = "현재 상영중인 영화 목록을 페이지별로 조회합니다.")
    @GetMapping("/now-playing")
    public ResponseEntity<MovieSearchResponse> getNowPlayingMovies(@PageableDefault(size = 20) Pageable pageable,
                                                                   @AuthenticationPrincipal UserDetails userDetails) {
        MovieSearchRequest request = createMovieSearchRequest(pageable, userDetails);
        request.setNowPlaying(true); // '현재 상영중' 플래그를 true로 설정
        return ResponseEntity.ok(movieSearchService.search(request));
    }

    @Operation(summary = "높은 평점 영화 목록 조회", description = "평점(vote_average)이 높은 순으로 영화 목록을 조회합니다.")
    @GetMapping("/top-rated")
    public ResponseEntity<MovieSearchResponse> getTopRatedMovies(@PageableDefault(size = 20) Pageable pageable,
                                                                 @AuthenticationPrincipal UserDetails userDetails) {
        MovieSearchRequest request = createMovieSearchRequest(pageable, userDetails);
        request.setSortBy("vote_average");
        request.setSortOrder("desc");
        request.setVoteCount(300);
        return ResponseEntity.ok(movieSearchService.search(request));
    }

    @Operation(summary = "개봉 예정 영화 목록 조회", description = "개봉일이 미래인 영화 목록을 개봉일 순으로 조회합니다.")
    @GetMapping("/upcoming")
    public ResponseEntity<MovieSearchResponse> getUpcomingMovies(@PageableDefault(size = 20) Pageable pageable,
                                                                 @AuthenticationPrincipal UserDetails userDetails) {
        MovieSearchRequest request = createMovieSearchRequest(pageable, userDetails);
        request.setReleaseDateFrom(LocalDate.now()); // 오늘부터
        request.setSortBy("release_date");
        request.setSortOrder("asc");
        return ResponseEntity.ok(movieSearchService.search(request));
    }

    @Operation(summary = "장르별 영화 목록 조회", description = "특정 장르에 해당하는 영화 목록을 조회합니다.")
    @GetMapping("/discover")
    // [수정] 프론트엔드에서 문자열로 넘어오는 genreId를 처리하기 위해 타입을 String으로 변경합니다.
    // [수정] @RequestParam에 "genreId" 이름을 명시하여 파라미터 매핑 오류를 해결합니다.
    public ResponseEntity<MovieSearchResponse> getMoviesByGenre(@RequestParam("genreId") String genreId, @PageableDefault(size = 20) Pageable pageable,
                                                                @AuthenticationPrincipal UserDetails userDetails) {
        MovieSearchRequest request = createMovieSearchRequest(pageable, userDetails);
        request.setGenres(List.of(Integer.parseInt(genreId))); // 서비스에 전달하기 전 Integer로 변환
        return ResponseEntity.ok(movieSearchService.search(request));
    }

    @Operation(summary = "모든 영화 목록 조회", description = "모든 영화 목록을 페이지별로 조회합니다. 기본 정렬은 인기도순입니다.")
    @GetMapping("/all")
    public ResponseEntity<MovieSearchResponse> getAllMovies(@PageableDefault(size = 20) Pageable pageable,
                                                            @AuthenticationPrincipal UserDetails userDetails) {
        MovieSearchRequest request = createMovieSearchRequest(pageable, userDetails);
        request.setSortBy("popularity");
        request.setSortOrder("desc");
        return ResponseEntity.ok(movieSearchService.search(request));
    }
    @GetMapping("/{movieId}/recommendations")
    public ResponseEntity<List<MovieDoc>> getRecommendations(@PathVariable("movieId") String movieId) {
        return ResponseEntity.ok(movieSearchService.recommend(movieId));
    }
}