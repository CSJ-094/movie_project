package com.boot.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class QuickMatchAlternativeRequest {
    private String sessionId;       // 현재 퀵매치 세션 ID
    private String currentMovieId;  // 지금 카드에 떠 있는 추천 영화 ID
}
