package com.boot.service;

import com.boot.entity.Favorite;
import com.boot.entity.User;
import com.boot.repository.FavoriteRepository;
import com.boot.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;

    // 찜 추가/삭제 토글
    public boolean toggleFavorite(String userEmail, String movieId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        return favoriteRepository.findByUserIdAndMovieId(user.getId(), movieId)
                .map(favorite -> {
                    // 이미 찜한 경우, 삭제
                    favoriteRepository.delete(favorite);
                    return false; // 찜 해제됨
                })
                .orElseGet(() -> {
                    // 찜하지 않은 경우, 추가
                    favoriteRepository.save(new Favorite(user, movieId));
                    return true; // 찜 추가됨
                });
    }

    // 특정 영화에 대한 찜 상태 확인
    @Transactional(readOnly = true)
    public boolean isFavorite(String userEmail, String movieId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));
        return favoriteRepository.existsByUserIdAndMovieId(user.getId(), movieId);
    }

    // 사용자가 찜한 모든 영화 ID 목록 조회
    @Transactional(readOnly = true)
    public List<String> getFavoriteMovieIds(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));
        List<Favorite> favorites = favoriteRepository.findByUserId(user.getId());
        return favorites.stream()
                .map(fav -> fav.getMovieId().toString())
                .collect(Collectors.toList());
    }
}
