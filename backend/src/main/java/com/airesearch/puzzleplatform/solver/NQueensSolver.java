package com.airesearch.puzzleplatform.solver;

import java.util.*;

public class NQueensSolver {

    public static class StepEvent {
        public String type; // "try", "invalid", "backtrack", "assign"
        public int row;
        public int col;
        public int searchDepth;
        public int backtracks;
        public String explanation;

        public StepEvent() {}

        public StepEvent(String type, int row, int col, int searchDepth, int backtracks, String explanation) {
            this.type = type;
            this.row = row;
            this.col = col;
            this.searchDepth = searchDepth;
            this.backtracks = backtracks;
            this.explanation = explanation;
        }
    }

    public interface SolverListener {
        void onStep(StepEvent event);
    }

    private boolean[] cols;
    private boolean[] diag1; // Major diagonals (r - c + n - 1)
    private boolean[] diag2; // Minor diagonals (r + c)
    private int nodesExplored = 0;
    private int backtracks = 0;

    public boolean solve(int n, SolverListener listener) {
        cols = new boolean[n];
        diag1 = new boolean[2 * n - 1];
        diag2 = new boolean[2 * n - 1];
        int[] boardLayout = new int[n];
        Arrays.fill(boardLayout, -1);
        return executeBacktrack(0, n, boardLayout, listener);
    }

    private boolean executeBacktrack(int row, int n, int[] board, SolverListener listener) {
        nodesExplored++;
        if (row == n) {
            return true; // Valid Leaf Node Reached
        }

        for (int col = 0; col < n; col++) {
            int d1 = row - col + n - 1;
            int d2 = row + col;

            if (listener != null) {
                listener.onStep(new StepEvent(
                    "try", row, col, row, backtracks,
                    "Evaluating cell (" + row + "," + col + ") for Queen placement."
                ));
            }

            // Check hard constraints
            if (!cols[col] && !diag1[d1] && !diag2[d2]) {
                // Assign Value / Mutate State
                board[row] = col;
                cols[col] = diag1[d1] = diag2[d2] = true;

                if (listener != null) {
                    listener.onStep(new StepEvent(
                        "assign", row, col, row, backtracks,
                        "Placed queen safely at (" + row + "," + col + "). Constraint checks passed."
                    ));
                }

                if (executeBacktrack(row + 1, n, board, listener)) {
                    return true;
                }

                // CRITICAL ADA COMPONENT: Backtrack / Revert State mutation
                cols[col] = diag1[d1] = diag2[d2] = false;
                board[row] = -1;
                backtracks++;

                if (listener != null) {
                    listener.onStep(new StepEvent(
                        "backtrack", row, col, row, backtracks,
                        "Backtracking from (" + row + "," + col + ") due to downstream conflicts."
                    ));
                }
            } else {
                if (listener != null) {
                    listener.onStep(new StepEvent(
                        "invalid", row, col, row, backtracks,
                        "Cell (" + row + "," + col + ") is under attack. Pruning branch."
                    ));
                }
            }
        }
        return false;
    }

    public int getNodesExplored() {
        return nodesExplored;
    }

    public int getBacktracks() {
        return backtracks;
    }
}
