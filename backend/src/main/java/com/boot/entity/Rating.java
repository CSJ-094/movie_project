package com.boot.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "rating",
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"user_id", "movie_id"})
       })
public class Rating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "movie_id", nullable = false)
    private String movieId; // Long -> String

    @Column(name = "rating", nullable = false)
    private double rating; // 0.5 ~ 5.0

    public Rating(User user, String movieId, double rating) { // Long -> String
        this.user = user;
        this.movieId = movieId;
        this.rating = rating;
    }
}
