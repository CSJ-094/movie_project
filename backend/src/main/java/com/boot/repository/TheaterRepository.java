package com.boot.repository;

import com.boot.entity.Theater;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TheaterRepository extends JpaRepository<Theater, Long> {
    // 지역별 영화관 조회
    List<Theater> findByRegion(String region);

    // 체인별 영화관 조회
    List<Theater> findByChain(String chain);

    // 지역과 체인으로 영화관 조회
    List<Theater> findByRegionAndChain(String region, String chain);
}
