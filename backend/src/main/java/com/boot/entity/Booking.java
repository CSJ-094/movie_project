package com.boot.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "booking")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "showtime_id", nullable = false)
    private Showtime showtime;

    @Column(name = "seats", nullable = false, columnDefinition = "TEXT")
    private String seats; // "A1,A2,A3" 형식

    @Column(name = "seat_count", nullable = false)
    private Integer seatCount;

    @Column(name = "total_price", nullable = false)
    private Integer totalPrice;

    @Column(name = "booking_status", nullable = false)
    private String bookingStatus; // CONFIRMED, CANCELLED

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public Booking(User user, Showtime showtime, String seats, Integer seatCount, Integer totalPrice, String bookingStatus) {
        this.user = user;
        this.showtime = showtime;
        this.seats = seats;
        this.seatCount = seatCount;
        this.totalPrice = totalPrice;
        this.bookingStatus = bookingStatus;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // 예매 취소
    public void cancel() {
        this.bookingStatus = "CANCELLED";
    }

    // 예매 확정
    public void confirm() {
        this.bookingStatus = "CONFIRMED";
    }
}
