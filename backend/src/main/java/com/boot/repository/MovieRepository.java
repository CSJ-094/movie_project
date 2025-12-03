package com.boot.repository;


import com.boot.elastic.Movie;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface MovieRepository extends ElasticsearchRepository<Movie, String> {

    // 제목(Title) 또는 줄거리(Overview)에 검색어가 포함된 영화 찾기
    Page<Movie> findMovieByTitleOrOverview(String title, String overview, Pageable pageable);
}