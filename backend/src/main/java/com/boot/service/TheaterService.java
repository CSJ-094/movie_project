package com.boot.service;

import com.boot.dto.TheaterDto;
import com.boot.entity.Theater;
import com.boot.repository.TheaterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TheaterService {
    
    private final TheaterRepository theaterRepository;

    /**
     * 전체 영화관 목록 조회
     */
    public List<TheaterDto> getAllTheaters() {
        return theaterRepository.findAll().stream()
                .map(TheaterDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 특정 영화관 조회
     */
    public TheaterDto getTheaterById(Long theaterId) {
        Theater theater = theaterRepository.findById(theaterId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 영화관입니다."));
        return TheaterDto.fromEntity(theater);
    }

    /**
     * 지역별 영화관 조회
     */
    public List<TheaterDto> getTheatersByRegion(String region) {
        return theaterRepository.findByRegion(region).stream()
                .map(TheaterDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 체인별 영화관 조회
     */
    public List<TheaterDto> getTheatersByChain(String chain) {
        return theaterRepository.findByChain(chain).stream()
                .map(TheaterDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 지역 + 체인으로 영화관 조회
     */
    public List<TheaterDto> getTheatersByRegionAndChain(String region, String chain) {
        return theaterRepository.findByRegionAndChain(region, chain).stream()
                .map(TheaterDto::fromEntity)
                .collect(Collectors.toList());
    }
}
