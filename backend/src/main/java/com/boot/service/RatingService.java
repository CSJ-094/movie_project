package com.boot.service;

import com.boot.entity.Rating;
import com.boot.entity.User;
import com.boot.repository.RatingRepository;
import com.boot.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class RatingService {

    private final RatingRepository ratingRepository;
    private final UserRepository userRepository;

    // 별점 추가 또는 수정
    public void addOrUpdateRating(String userEmail, String movieId, double rating) { // Long -> String
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        ratingRepository.findByUserAndMovieId(user, movieId)
                .ifPresentOrElse(
                        existingRating -> {
                            // 이미 별점이 존재하면, 점수만 업데이트
                            existingRating.setRating(rating);
                            ratingRepository.save(existingRating);
                        },
                        () -> {
                            // 별점이 없으면, 새로 생성 (기본 생성자 및 setter 사용)
                            Rating newRating = new Rating();
                            newRating.setUser(user);
                            newRating.setMovieId(movieId); // movieId는 String 타입이므로 그대로 사용
                            newRating.setRating(rating);
                            ratingRepository.save(newRating);
                        });
    }

    // 사용자가 매긴 모든 별점 정보 조회 (UserProfileService에서 사용)
    @Transactional(readOnly = true)
    public Map<String, Integer> getUserRatings(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        List<Rating> ratings = ratingRepository.findByUserId(user.getId());

        return ratings.stream()
                .collect(Collectors.toMap(
                        Rating::getMovieId, // Already String
                        rating -> (int) rating.getRating() // Double -> Integer
                ));
    }

    // 기존 메서드 이름 변경 (혼동 방지)
    @Transactional(readOnly = true)
    public Map<String, Double> getRatingsByUser(String userEmail) { // Map<Long, Double> -> Map<String, Double>
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        List<Rating> ratings = ratingRepository.findByUserId(user.getId());

        return ratings.stream()
                .collect(Collectors.toMap(Rating::getMovieId, Rating::getRating)); // Key is already String
    }
}
