package com.airesearch.puzzleplatform.solver;

import java.util.*;

public class SudokuSolver {

    public static class StepEvent {
        public String type; // "try", "invalid", "backtrack", "assign"
        public int row;
        public int col;
        public int value;
        public int searchDepth;
        public int backtracks;
        public String explanation;

        public StepEvent() {}

        public StepEvent(String type, int row, int col, int value, int searchDepth, int backtracks, String explanation) {
            this.type = type;
            this.row = row;
            this.col = col;
            this.value = value;
            this.searchDepth = searchDepth;
            this.backtracks = backtracks;
            this.explanation = explanation;
        }
    }

    public interface SolverListener {
        void onStep(StepEvent event);
    }

    private final int[][] grid;
    private final int[][][] domains; // Domain array for Forward Checking: [9][9][10] where index 1-9 is candidate validity (1 = active, 0 = restricted)
    private int nodesExplored = 0;
    private int backtracks = 0;

    public SudokuSolver(int[][] initialGrid) {
        this.grid = new int[9][9];
        this.domains = new int[9][9][10];
        
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                this.grid[r][c] = initialGrid[r][c];
                // Initialize domain values 1-9 to active (1)
                Arrays.fill(this.domains[r][c], 1);
            }
        }
    }

    public boolean solve(SolverListener listener) {
        if (!validateInitialState()) {
            return false;
        }
        initializeDomains();
        return backtrackSolve(0, listener);
    }

    private boolean validateInitialState() {
        for (int i = 0; i < 9; i++) {
            boolean[] rowCheck = new boolean[10];
            boolean[] colCheck = new boolean[10];
            boolean[] boxCheck = new boolean[10];
            for (int j = 0; j < 9; j++) {
                // Check Row
                int rv = grid[i][j];
                if (rv != 0) {
                    if (rowCheck[rv]) return false;
                    rowCheck[rv] = true;
                }
                // Check Column
                int cv = grid[j][i];
                if (cv != 0) {
                    if (colCheck[cv]) return false;
                    colCheck[cv] = true;
                }
                // Check Box
                int br = 3 * (i / 3) + j / 3;
                int bc = 3 * (i % 3) + j % 3;
                int bv = grid[br][bc];
                if (bv != 0) {
                    if (boxCheck[bv]) return false;
                    boxCheck[bv] = true;
                }
            }
        }
        return true;
    }

    private void initializeDomains() {
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                if (grid[r][c] != 0) {
                    int val = grid[r][c];
                    restrictNeighborDomains(r, c, val);
                }
            }
        }
    }

    private void restrictNeighborDomains(int row, int col, int val) {
        // Mark val as invalid in cell's own domain
        for (int v = 1; v <= 9; v++) {
            if (v != val) {
                domains[row][col][v] = 0;
            }
        }
        
        // Remove val from row, col, and box domains of other cells
        for (int i = 0; i < 9; i++) {
            if (i != col) {
                domains[row][i][val] = 0;
            }
            if (i != row) {
                domains[i][col][val] = 0;
            }
        }
        int boxRowStart = (row / 3) * 3;
        int boxColStart = (col / 3) * 3;
        for (int r = boxRowStart; r < boxRowStart + 3; r++) {
            for (int c = boxColStart; c < boxColStart + 3; c++) {
                if (r != row || c != col) {
                    domains[r][c][val] = 0;
                }
            }
        }
    }

    private boolean backtrackSolve(int depth, SolverListener listener) {
        nodesExplored++;
        
        // MRV: Choose the unassigned cell with the smallest domain size
        int bestRow = -1;
        int bestCol = -1;
        int minRemaining = Integer.MAX_VALUE;

        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                if (grid[r][c] == 0) {
                    int count = getCandidateCount(r, c);
                    if (count < minRemaining) {
                        minRemaining = count;
                        bestRow = r;
                        bestCol = c;
                    }
                }
            }
        }

        // If no unassigned cells remain, Sudoku is solved!
        if (bestRow == -1) {
            return true;
        }

        // If a cell has zero options left, backtrack
        if (minRemaining == 0) {
            backtracks++;
            return false;
        }

        // Try candidate values 1-9 for this MRV cell
        for (int val = 1; val <= 9; val++) {
            if (domains[bestRow][bestCol][val] == 1) {
                
                // Snapshot domains for backtracking restoration
                int[][][] domainBackup = clone3DArray(domains);
                
                grid[bestRow][bestCol] = val;
                restrictNeighborDomains(bestRow, bestCol, val);
                
                if (listener != null) {
                    listener.onStep(new StepEvent(
                        "try", bestRow, bestCol, val, depth, backtracks,
                        "MRV prioritized cell (" + bestRow + "," + bestCol + ") with candidate size of " + minRemaining + ". Trying candidate " + val + "."
                    ));
                }

                // Forward Checking: Ensure no empty cells have been reduced to zero legal candidates
                if (forwardCheckingPassed()) {
                    if (listener != null) {
                        listener.onStep(new StepEvent(
                            "assign", bestRow, bestCol, val, depth, backtracks,
                            "Forward checking passed. Cell (" + bestRow + "," + bestCol + ") successfully assigned candidate " + val + "."
                        ));
                    }
                    
                    if (backtrackSolve(depth + 1, listener)) {
                        return true;
                    }
                } else {
                    if (listener != null) {
                        listener.onStep(new StepEvent(
                            "invalid", bestRow, bestCol, val, depth, backtracks,
                            "Forward check failed for " + val + " at (" + bestRow + "," + bestCol + "). Neighbors left with empty domains. Pruning branch."
                        ));
                    }
                }

                // Backtrack: Reset cell assignment and restore domains
                grid[bestRow][bestCol] = 0;
                copyArrayValues(domainBackup, domains);
                backtracks++;
                
                if (listener != null) {
                    listener.onStep(new StepEvent(
                        "backtrack", bestRow, bestCol, val, depth, backtracks,
                        "Backtracking from cell (" + bestRow + "," + bestCol + ") on value " + val + "."
                    ));
                }
            }
        }
        return false;
    }

    private int getCandidateCount(int r, int c) {
        int cnt = 0;
        for (int v = 1; v <= 9; v++) {
            if (domains[r][c][v] == 1) cnt++;
        }
        return cnt;
    }

    private boolean forwardCheckingPassed() {
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                if (grid[r][c] == 0 && getCandidateCount(r, c) == 0) {
                    return false; // Prune branch early: cell left with 0 candidates
                }
            }
        }
        return true;
    }

    private int[][][] clone3DArray(int[][][] src) {
        int[][][] copy = new int[9][9][10];
        for (int i = 0; i < 9; i++) {
            for (int j = 0; j < 9; j++) {
                System.arraycopy(src[i][j], 0, copy[i][j], 0, 10);
            }
        }
        return copy;
    }

    private void copyArrayValues(int[][][] src, int[][][] dest) {
        for (int i = 0; i < 9; i++) {
            for (int j = 0; j < 9; j++) {
                System.arraycopy(src[i][j], 0, dest[i][j], 0, 10);
            }
        }
    }

    // Benchmark statistics accessors
    public int getNodesExplored() { return nodesExplored; }
    public int getBacktracks() { return backtracks; }
    public int[][] getGrid() { return grid; }
}
