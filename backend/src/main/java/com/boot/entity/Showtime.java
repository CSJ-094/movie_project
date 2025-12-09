package com.boot.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "showtime")
public class Showtime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false)
    private Long id;

    @Column(name = "movie_id", nullable = false)
    private String movieId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "screen_id", nullable = false)
    private Screen screen;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(name = "price", nullable = false)
    private Integer price;

    @Column(name = "available_seats", nullable = false)
    private Integer availableSeats;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "showtime", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Booking> bookings = new ArrayList<>();

    @Builder
    public Showtime(String movieId, Screen screen, LocalDateTime startTime, LocalDateTime endTime, Integer price, Integer availableSeats) {
        this.movieId = movieId;
        this.screen = screen;
        this.startTime = startTime;
        this.endTime = endTime;
        this.price = price;
        this.availableSeats = availableSeats;
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

    // 좌석 차감
    public void decreaseAvailableSeats(int count) {
        if (this.availableSeats < count) {
            throw new IllegalStateException("좌석이 부족합니다.");
        }
        this.availableSeats -= count;
    }

    // 좌석 증가 (예매 취소 시)
    public void increaseAvailableSeats(int count) {
        this.availableSeats += count;
    }

    public void addBooking(Booking booking) {
        this.bookings.add(booking);
    }
}
