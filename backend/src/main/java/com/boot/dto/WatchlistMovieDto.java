package com.boot.dto;

import com.boot.entity.Watchlist;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class WatchlistMovieDto {
    private String movieId;
    private boolean watched;

    public static WatchlistMovieDto fromEntity(Watchlist watchlist) {
        return WatchlistMovieDto.builder()
                .movieId(watchlist.getMovieId())
                .watched(watchlist.isWatched())
                .build();
    }
}
