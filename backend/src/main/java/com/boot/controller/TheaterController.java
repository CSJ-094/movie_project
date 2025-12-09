package com.boot.controller;

import com.boot.dto.ScreenDto;
import com.boot.dto.TheaterDto;
import com.boot.entity.Screen;
import com.boot.repository.ScreenRepository;
import com.boot.service.TheaterService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/theaters")
@RequiredArgsConstructor
public class TheaterController {

    private final TheaterService theaterService;
    private final ScreenRepository screenRepository;

    @Operation(summary = "전체 영화관 목록 조회", description = "모든 영화관 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<List<TheaterDto>> getAllTheaters(
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String chain
    ) {
        List<TheaterDto> theaters;

        if (region != null && chain != null) {
            theaters = theaterService.getTheatersByRegionAndChain(region, chain);
        } else if (region != null) {
            theaters = theaterService.getTheatersByRegion(region);
        } else if (chain != null) {
            theaters = theaterService.getTheatersByChain(chain);
        } else {
            theaters = theaterService.getAllTheaters();
        }

        return ResponseEntity.ok(theaters);
    }

    @Operation(summary = "특정 영화관 조회", description = "영화관 ID로 영화관 정보를 조회합니다.")
    @GetMapping("/{theaterId}")
    public ResponseEntity<TheaterDto> getTheaterById(@PathVariable Long theaterId) {
        TheaterDto theater = theaterService.getTheaterById(theaterId);
        return ResponseEntity.ok(theater);
    }

    @Operation(summary = "영화관의 상영관 목록 조회", description = "특정 영화관의 모든 상영관 목록을 조회합니다.")
    @GetMapping("/{theaterId}/screens")
    public ResponseEntity<List<ScreenDto>> getScreensByTheater(@PathVariable Long theaterId) {
        List<Screen> screens = screenRepository.findByTheaterId(theaterId);
        List<ScreenDto> screenDtos = screens.stream()
                .map(ScreenDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(screenDtos);
    }
}
