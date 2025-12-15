package com.boot.util;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;
import java.io.BufferedReader;
import java.io.InputStreamReader;

@Slf4j
@Component
public class MovieScheduler {


    private static final String PYTHON_CMD = "python";
    private static final String SCRIPT_PATH = "C:\\temp3\\movie_project\\etl\\Movie_El.py";
    @Scheduled(cron = "0 0 4 * * *") // 매일 새벽 4시 실행
//    @Scheduled(initialDelay = 5000, fixedDelay = 100000000)
    public void runPythonEtl() {
        log.info("파이썬 스크립트 실행 시작");

        try {

            ProcessBuilder processBuilder = new ProcessBuilder(PYTHON_CMD, SCRIPT_PATH);

            Process process = processBuilder.start();

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.info("[Python] " + line);
                }
            }
        } catch (Exception e) {
            log.error("파이썬 스크립트 실행 실패", e);
        }
    }
}