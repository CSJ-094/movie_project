package com.boot.entity;

import jakarta.persistence.*; // javax.persistence -> jakarta.persistence로 변경
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "favorite",
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"user_id", "movie_id"})
       })
public class Favorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "movie_id", nullable = false)
    private String movieId; // Long -> String

    public Favorite(User user, String movieId) { // Long -> String
        this.user = user;
        this.movieId = movieId;
    }
}
