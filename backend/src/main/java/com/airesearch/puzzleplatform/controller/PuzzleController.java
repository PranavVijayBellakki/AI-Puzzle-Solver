package com.airesearch.puzzleplatform.controller;

import com.airesearch.puzzleplatform.model.SavedPuzzle;
import com.airesearch.puzzleplatform.repository.SavedPuzzleRepository;
import com.airesearch.puzzleplatform.solver.SudokuSolver;
import com.airesearch.puzzleplatform.solver.KakuroSolver;
import com.airesearch.puzzleplatform.solver.CheckersAI;
import com.airesearch.puzzleplatform.solver.NQueensSolver;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/solve")
public class PuzzleController {

    private final SavedPuzzleRepository savedPuzzleRepository;
    private final SolverWebSocketController webSocketController;

    public PuzzleController(SavedPuzzleRepository savedPuzzleRepository, SolverWebSocketController webSocketController) {
        this.savedPuzzleRepository = savedPuzzleRepository;
        this.webSocketController = webSocketController;
    }

    @PostMapping("/session/start")
    public ResponseEntity<?> startSession(@RequestBody Map<String, Object> request) {
        String gameType = (String) request.get("gameType");
        String sessionId = UUID.randomUUID().toString();

        if ("SUDOKU".equalsIgnoreCase(gameType)) {
            // Process grid parameters
            List<List<Integer>> raw = (List<List<Integer>>) request.get("grid");
            int[][] grid = new int[9][9];
            for (int r = 0; r < 9; r++) {
                for (int c = 0; c < 9; c++) {
                    grid[r][c] = raw.get(r).get(c);
                }
            }

            // Run solving async to prevent HTTP request locking
            CompletableFuture.runAsync(() -> {
                SudokuSolver solver = new SudokuSolver(grid);
                solver.solve(event -> {
                    // Push live explore step over WebSockets
                    webSocketController.streamSudokuStep(sessionId, event);
                    try {
                        Thread.sleep(50); // Small delay to allow human-friendly visualization speed
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                });
            });

            Map<String, String> res = new HashMap<>();
            res.put("sessionId", sessionId);
            res.put("wsTopic", "/topic/solver/" + sessionId);
            return ResponseEntity.ok(res);
        } else if ("KAKURO".equalsIgnoreCase(gameType)) {
            // Process grid layout parameters
            List<List<Integer>> raw = (List<List<Integer>>) request.get("grid");
            int rows = raw.size();
            int cols = raw.get(0).size();
            int[][] grid = new int[rows][cols];
            for (int r = 0; r < rows; r++) {
                for (int c = 0; c < cols; c++) {
                    grid[r][c] = raw.get(r).get(c);
                }
            }

            // Extract Kakuro run structures
            List<KakuroSolver.Run> detectedRuns = new ArrayList<>();
            List<Map<String, Object>> rawRuns = (List<Map<String, Object>>) request.get("runs");
            if (rawRuns != null) {
                for (Map<String, Object> rawRun : rawRuns) {
                    int targetSum = ((Number) rawRun.get("targetSum")).intValue();
                    List<Map<String, Object>> rawCells = (List<Map<String, Object>>) rawRun.get("cells");
                    List<KakuroSolver.CellCoord> cells = new ArrayList<>();
                    for (Map<String, Object> rawCell : rawCells) {
                        int cellR = ((Number) rawCell.get("r")).intValue();
                        int cellC = ((Number) rawCell.get("c")).intValue();
                        cells.add(new KakuroSolver.CellCoord(cellR, cellC));
                    }
                    detectedRuns.add(new KakuroSolver.Run(targetSum, cells));
                }
            }

            CompletableFuture.runAsync(() -> {
                KakuroSolver solver = new KakuroSolver(grid, detectedRuns);
                solver.solve(event -> {
                    webSocketController.streamKakuroStep(sessionId, event);
                    try {
                        Thread.sleep(60);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                });
            });

            Map<String, String> res = new HashMap<>();
            res.put("sessionId", sessionId);
            res.put("wsTopic", "/topic/solver/" + sessionId);
            return ResponseEntity.ok(res);
        } else if ("CHECKERS".equalsIgnoreCase(gameType)) {
            // Process checkers board parameter
            List<List<Integer>> raw = (List<List<Integer>>) request.get("board");
            int[][] board = new int[8][8];
            for (int r = 0; r < 8; r++) {
                for (int c = 0; c < 8; c++) {
                    board[r][c] = raw.get(r).get(c);
                }
            }
            int activePlayer = ((Number) request.get("activePlayer")).intValue();

            CompletableFuture.runAsync(() -> {
                CheckersAI solver = new CheckersAI();
                solver.getBestMove(board, activePlayer, event -> {
                    webSocketController.streamCheckersEval(sessionId, event);
                    try {
                        Thread.sleep(50);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                });
            });

            Map<String, String> res = new HashMap<>();
            res.put("sessionId", sessionId);
            res.put("wsTopic", "/topic/solver/" + sessionId);
            return ResponseEntity.ok(res);
        } else if ("NQUEENS".equalsIgnoreCase(gameType)) {
            int n = ((Number) request.get("size")).intValue();

            CompletableFuture.runAsync(() -> {
                NQueensSolver solver = new NQueensSolver();
                solver.solve(n, event -> {
                    webSocketController.streamNQueensStep(sessionId, event);
                    try {
                        Thread.sleep(60);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                });
            });

            Map<String, String> res = new HashMap<>();
            res.put("sessionId", sessionId);
            res.put("wsTopic", "/topic/solver/" + sessionId);
            return ResponseEntity.ok(res);
        }

        Map<String, String> err = new HashMap<>();
        err.put("error", "Unsupported puzzle type requested.");
        return ResponseEntity.badRequest().body(err);
    }
}
