package com.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class GenreOption {
    private  Integer id; // TMDB genre_id (예: 28)
    private String name; // 한글 이름 (예: "액션")
}
