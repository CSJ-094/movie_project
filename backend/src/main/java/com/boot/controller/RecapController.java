package com.boot.controller;

import com.boot.dto.RecapResponseDto;
import com.boot.service.RecapService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recap")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class RecapController {

    private final RecapService recapService;

    @GetMapping
    public ResponseEntity<RecapResponseDto> getRecap() {
        return ResponseEntity.ok(recapService.getRecap());
    }
}
