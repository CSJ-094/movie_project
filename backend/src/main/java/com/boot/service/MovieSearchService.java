package com.boot.service;

import com.boot.dto.MovieDoc;
import com.boot.dto.MovieSearchRequest;
import com.boot.dto.MovieSearchResponse;
import com.boot.elastic.Movie;
import com.boot.repository.MovieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MovieSearchService {

    private final MovieRepository movieRepository;
    private static final String TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

    public MovieSearchResponse search(MovieSearchRequest request) {
        PageRequest pageRequest = PageRequest.of(request.getPage(), request.getSize());
        Page<Movie> moviePage = movieRepository.findMovieByTitleOrOverview(request.getKeyword(), request.getKeyword(), pageRequest);

        List<MovieDoc> movieDocs = moviePage.getContent().stream()
                .map(this::convertToMovieDoc)
                .collect(Collectors.toList());

        return MovieSearchResponse.builder()
                .totalHits(moviePage.getTotalElements())
                .page(request.getPage())
                .size(request.getSize())
                .movies(movieDocs)
                .build();
    }

    private MovieDoc convertToMovieDoc(Movie movie) {
        MovieDoc movieDoc = new MovieDoc();
        movieDoc.setMovieId(String.valueOf(movie.getId()));
        movieDoc.setTitle(movie.getTitle());
        movieDoc.setOverview(movie.getOverview());
        if (StringUtils.hasText(movie.getPosterPath())) {
            movieDoc.setPosterUrl(TMDB_IMAGE_BASE_URL + movie.getPosterPath());
        } else {
            movieDoc.setPosterUrl(null);
        }
        movieDoc.setVoteAverage(movie.getVoteAverage());
        movieDoc.setReleaseDate(movie.getReleaseDate());
        movieDoc.setIsNowPlaying(movie.getIsNowPlaying());
        return movieDoc;
    }
}
