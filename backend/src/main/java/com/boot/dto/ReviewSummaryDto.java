package com.boot.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReviewSummaryDto { //ai 요약 결과

    private String goodPoints;     // 장점 요약
    private String badPoints;      // 단점 요약
    private String overall;        // 한 줄 총평

    private Double positiveRatio;  // 긍정 비율 0~1
    private Double negativeRatio;  // 부정 비율 0~1
    private Double neutralRatio;   // 중립 비율 0~1

}
