package com.boot.service;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.GetResponse;
import com.boot.dto.ShowtimeResponseDto;
import com.boot.elastic.Movie;
import com.boot.entity.Showtime;
import com.boot.repository.ShowtimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShowtimeService {

    private final ShowtimeRepository showtimeRepository;
    private final ElasticsearchClient elasticsearchClient;

    /**
     * 영화별 시간표 조회 (Elasticsearch 영화 정보 결합)
     */
    public List<ShowtimeResponseDto> getShowtimesByMovie(String movieId) {
        List<Showtime> showtimes = showtimeRepository.findByMovieIdAndStartTimeBetween(
                movieId,
                LocalDateTime.now(),
                LocalDateTime.now().plusDays(7)
        );

        return showtimes.stream()
                .map(showtime -> {
                    ShowtimeResponseDto dto = ShowtimeResponseDto.fromEntity(showtime);
                    enrichWithMovieData(dto);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * 특정 영화관의 날짜별 시간표 조회
     */
    public List<ShowtimeResponseDto> getShowtimesByTheaterAndDate(Long theaterId, LocalDate date) {
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(LocalTime.MAX);

        List<Showtime> showtimes = showtimeRepository.findByTheaterIdAndDateRange(theaterId, startOfDay, endOfDay);

        return showtimes.stream()
                .map(showtime -> {
                    ShowtimeResponseDto dto = ShowtimeResponseDto.fromEntity(showtime);
                    enrichWithMovieData(dto);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * 영화 + 영화관 + 날짜별 시간표 조회 (예매 페이지용)
     */
    public List<ShowtimeResponseDto> getShowtimesByMovieTheaterAndDate(String movieId, Long theaterId, LocalDate date) {
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(LocalTime.MAX);

        List<Showtime> showtimes = showtimeRepository.findByMovieIdAndTheaterIdAndDateRange(movieId, theaterId, startOfDay, endOfDay);

        return showtimes.stream()
                .map(showtime -> {
                    ShowtimeResponseDto dto = ShowtimeResponseDto.fromEntity(showtime);
                    enrichWithMovieData(dto);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * 영화별 + 지역별 시간표 조회
     */
    public List<ShowtimeResponseDto> getShowtimesByMovieAndRegion(String movieId, String region) {
        List<Showtime> showtimes = showtimeRepository.findByMovieIdAndRegion(
                movieId,
                region,
                LocalDateTime.now()
        );

        return showtimes.stream()
                .map(showtime -> {
                    ShowtimeResponseDto dto = ShowtimeResponseDto.fromEntity(showtime);
                    enrichWithMovieData(dto);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * 영화별 + 체인별 시간표 조회
     */
    public List<ShowtimeResponseDto> getShowtimesByMovieAndChain(String movieId, String chain) {
        List<Showtime> showtimes = showtimeRepository.findByMovieIdAndChain(
                movieId,
                chain,
                LocalDateTime.now()
        );

        return showtimes.stream()
                .map(showtime -> {
                    ShowtimeResponseDto dto = ShowtimeResponseDto.fromEntity(showtime);
                    enrichWithMovieData(dto);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * 시간표 상세 조회
     */
    public ShowtimeResponseDto getShowtimeDetail(Long showtimeId) {
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 시간표입니다."));

        ShowtimeResponseDto dto = ShowtimeResponseDto.fromEntity(showtime);
        enrichWithMovieData(dto);
        return dto;
    }

    /**
     * Elasticsearch에서 영화 정보 조회 후 DTO에 추가
     */
    private void enrichWithMovieData(ShowtimeResponseDto dto) {
        try {
            // movieId에서 "tmdb_" 접두사 제거
            String elasticId = dto.getMovieId().replace("tmdb_", "");

            GetResponse<Movie> response = elasticsearchClient.get(
                    g -> g.index("movies").id(elasticId),
                    Movie.class
            );

            if (response.found() && response.source() != null) {
                Movie movie = response.source();
                dto.setMovieTitle(movie.getTitle());
                dto.setPosterPath(movie.getPosterPath());
                dto.setRuntime(movie.getRuntime() != null ? movie.getRuntime() : 120);
                dto.setVoteAverage(movie.getVoteAverage() != null ? movie.getVoteAverage().doubleValue() : 0.0);
            } else {
                // 영화 정보가 없을 경우 기본값
                dto.setMovieTitle("Movie ID: " + dto.getMovieId());
                dto.setRuntime(120);
                dto.setVoteAverage(0.0);
            }
        } catch (Exception e) {
            // Elasticsearch 조회 실패 시 기본값 유지 (로그 출력)
            System.err.println("Elasticsearch 연결 실패: " + e.getMessage());
            dto.setMovieTitle("Movie ID: " + dto.getMovieId());
            dto.setRuntime(120);
            dto.setVoteAverage(0.0);
        }
    }
}
