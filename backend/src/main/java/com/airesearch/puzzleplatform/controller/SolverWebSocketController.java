package com.airesearch.puzzleplatform.controller;

import com.airesearch.puzzleplatform.solver.SudokuSolver;
import com.airesearch.puzzleplatform.solver.KakuroSolver;
import com.airesearch.puzzleplatform.solver.CheckersAI;
import com.airesearch.puzzleplatform.solver.NQueensSolver;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class SolverWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    public SolverWebSocketController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Broadcasts a real-time Sudoku backtracking explore step event.
     */
    public void streamSudokuStep(String sessionId, SudokuSolver.StepEvent event) {
        String destination = "/topic/solver/" + sessionId;
        messagingTemplate.convertAndSend(destination, event);
    }

    /**
     * Broadcasts a real-time Kakuro CSP backtracking step event.
     */
    public void streamKakuroStep(String sessionId, KakuroSolver.StepEvent event) {
        String destination = "/topic/solver/" + sessionId;
        messagingTemplate.convertAndSend(destination, event);
    }

    /**
     * Broadcasts a real-time Checkers Minimax evaluation status update.
     */
    public void streamCheckersEval(String sessionId, CheckersAI.StepEvent event) {
        String destination = "/topic/solver/" + sessionId;
        messagingTemplate.convertAndSend(destination, event);
    }

    /**
     * Broadcasts a real-time N-Queens backtracking explore step event.
     */
    public void streamNQueensStep(String sessionId, NQueensSolver.StepEvent event) {
        String destination = "/topic/solver/" + sessionId;
        messagingTemplate.convertAndSend(destination, event);
    }
}
