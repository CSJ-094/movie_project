package com.boot.repository;

import com.boot.entity.Screen;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScreenRepository extends JpaRepository<Screen, Long> {
    // 특정 영화관의 상영관 목록 조회
    List<Screen> findByTheaterId(Long theaterId);

    // 상영관 타입별 조회
    List<Screen> findByScreenType(String screenType);

    // 특정 영화관의 특정 타입 상영관 조회
    List<Screen> findByTheaterIdAndScreenType(Long theaterId, String screenType);
}
