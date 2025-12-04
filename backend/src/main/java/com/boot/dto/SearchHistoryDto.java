package com.boot.dto;

import com.boot.entity.SearchHistory;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class SearchHistoryDto {
    private Long id;
    private String query;

    public static SearchHistoryDto fromEntity(SearchHistory searchHistory) {
        return SearchHistoryDto.builder()
                .id(searchHistory.getId())
                .query(searchHistory.getQuery())
                .build();
    }
}
