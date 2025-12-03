package com.boot.elastic;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@Document(indexName = "movies", createIndex = false)
public class Movie {

    @Id
    @Field(name = "id", type = FieldType.Keyword)
    private String id; // ES에서 keyword니까 Long 말고 String이 더 안전

    @Field(type = FieldType.Text, analyzer = "nori_analyzer")
    private String title;

    @Field(type = FieldType.Text, analyzer = "nori_analyzer")
    private String overview;

    @Field(name = "poster_path", type = FieldType.Keyword)
    @JsonProperty("poster_path")
    private String posterPath;

    @Field(name = "vote_average", type = FieldType.Float)
    @JsonProperty("vote_average")
    private Float voteAverage;

    @Field(name = "is_now_playing", type = FieldType.Boolean)
    @JsonProperty("is_now_playing")
    private Boolean isNowPlaying;

    @Field(name = "release_date", type = FieldType.Date)
    @JsonProperty("release_date")
    private String releaseDate;
    // ES에서는 date지만, Java 쪽은 문자열로 받아도 됨.
    // LocalDate로 받고 싶으면 변환 로직 추가해야 하니까 지금은 String이 무난.

    @Field(name = "genre_ids", type = FieldType.Keyword)
    @JsonProperty("genre_ids")
    private List<String> genreIds;
}
