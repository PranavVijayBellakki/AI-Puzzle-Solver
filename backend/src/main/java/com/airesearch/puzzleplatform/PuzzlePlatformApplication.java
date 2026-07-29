package com.airesearch.puzzleplatform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.airesearch.puzzleplatform")
public class PuzzlePlatformApplication {
    public static void main(String[] args) {
        SpringApplication.run(PuzzlePlatformApplication.class, args);
    }
}
