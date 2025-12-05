package com.boot.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class BookingRequestDto {
    private Long userId;
    private Long showtimeId;
    private List<String> seats; // ["A1", "A2", "A3"]
    private Integer seatCount; // 좌석 개수
    private Integer totalPrice;
    private String bookingStatus; // 예매 상태 (CONFIRMED, CANCELLED)
}
