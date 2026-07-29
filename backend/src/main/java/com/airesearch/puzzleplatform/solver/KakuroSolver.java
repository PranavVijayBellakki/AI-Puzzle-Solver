package com.airesearch.puzzleplatform.solver;

import java.util.*;

public class KakuroSolver {

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

    public static class Run {
        public int targetSum;
        public List<CellCoord> cells = new ArrayList<>();

        public Run() {}
        public Run(int targetSum, List<CellCoord> cells) {
            this.targetSum = targetSum;
            this.cells.addAll(cells);
        }
    }

    public static class CellCoord {
        public int row, col;
        public CellCoord(int r, int c) { this.row = r; this.col = c; }
    }

    private final int[][] grid; // -1 for block/clue cells, 0 for empty, 1-9 for values
    private final List<Run> runs = new ArrayList<>();
    private final Map<String, List<Run>> cellToRunsMap = new HashMap<>();
    private int nodesExplored = 0;
    private int backtracks = 0;

    public KakuroSolver(int[][] layout, List<Run> detectedRuns) {
        this.grid = new int[layout.length][layout[0].length];
        for (int r = 0; r < layout.length; r++) {
            System.arraycopy(layout[r], 0, this.grid[r], 0, layout[r].length);
        }
        this.runs.addAll(detectedRuns);
        mapCellsToRuns();
    }

    private void mapCellsToRuns() {
        for (Run run : runs) {
            for (CellCoord cell : run.cells) {
                String key = cell.row + "," + cell.col;
                cellToRunsMap.computeIfAbsent(key, k -> new ArrayList<>()).add(run);
            }
        }
    }

    public boolean solve(SolverListener listener) {
        List<CellCoord> emptyCells = new ArrayList<>();
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[0].length; c++) {
                if (grid[r][c] == 0) {
                    emptyCells.add(new CellCoord(r, c));
                }
            }
        }
        return backtrackSolve(0, emptyCells, listener);
    }

    private boolean backtrackSolve(int cellIndex, List<CellCoord> emptyCells, SolverListener listener) {
        nodesExplored++;
        
        if (cellIndex == emptyCells.size()) {
            return validateAllSums();
        }

        CellCoord current = emptyCells.get(cellIndex);
        String cellKey = current.row + "," + current.col;
        List<Run> associatedRuns = cellToRunsMap.get(cellKey);

        for (int val = 1; val <= 9; val++) {
            if (isLocalConstraintSatisfied(current, val, associatedRuns)) {
                grid[current.row][current.col] = val;

                if (listener != null) {
                    listener.onStep(new StepEvent(
                        "try", current.row, current.col, val, cellIndex, backtracks,
                        "Trying value " + val + " at (" + current.row + "," + current.col + ") satisfying local uniqueness."
                    ));
                }

                // Perform summation boundaries look-ahead pruning checks
                if (pruningCheckPasses(associatedRuns)) {
                    if (listener != null) {
                        listener.onStep(new StepEvent(
                            "assign", current.row, current.col, val, cellIndex, backtracks,
                            "Pruning constraints passed. Cell assigned value " + val + "."
                        ));
                    }

                    if (backtrackSolve(cellIndex + 1, emptyCells, listener)) {
                        return true;
                    }
                } else {
                    if (listener != null) {
                        listener.onStep(new StepEvent(
                            "invalid", current.row, current.col, val, cellIndex, backtracks,
                            "Pruning sum check failed for " + val + " at (" + current.row + "," + current.col + "). Sum either exceeds target clue or cannot be satisfied with remaining unique values."
                        ));
                    }
                }

                grid[current.row][current.col] = 0; // Backtrack
                backtracks++;
                
                if (listener != null) {
                    listener.onStep(new StepEvent(
                        "backtrack", current.row, current.col, val, cellIndex, backtracks,
                        "Backtracking from cell (" + current.row + "," + current.col + ") on value " + val + "."
                    ));
                }
            }
        }
        return false;
    }

    private boolean isLocalConstraintSatisfied(CellCoord cell, int val, List<Run> runs) {
        for (Run run : runs) {
            for (CellCoord c : run.cells) {
                if (grid[c.row][c.col] == val) {
                    return false; // Violates uniqueness rule within the run
                }
            }
        }
        return true;
    }

    private boolean pruningCheckPasses(List<Run> associatedRuns) {
        for (Run run : associatedRuns) {
            int currentSum = 0;
            int emptyCount = 0;
            Set<Integer> usedValues = new HashSet<>();

            for (CellCoord c : run.cells) {
                int val = grid[c.row][c.col];
                if (val == 0) {
                    emptyCount++;
                } else {
                    currentSum += val;
                    usedValues.add(val);
                }
            }

            // 1. Early Exceed Check
            if (currentSum > run.targetSum) return false;

            if (emptyCount > 0) {
                int targetRemaining = run.targetSum - currentSum;
                
                // Get minimum and maximum possible sums using unique remaining digits
                int minRemainingSum = getExtremaSum(emptyCount, usedValues, true);
                int maxRemainingSum = getExtremaSum(emptyCount, usedValues, false);

                // 2. Sum Boundary Checks: Prune if remaining targets fall outside achievable extrema sums
                if (targetRemaining < minRemainingSum || targetRemaining > maxRemainingSum) {
                    return false; 
                }
            } else {
                if (currentSum != run.targetSum) return false;
            }
        }
        return true;
    }

    private int getExtremaSum(int count, Set<Integer> excluded, boolean findMin) {
        int sum = 0;
        int found = 0;
        int step = findMin ? 1 : 9;
        int direction = findMin ? 1 : -1;

        for (int v = step; v >= 1 && v <= 9; v += direction) {
            if (!excluded.contains(v)) {
                sum += v;
                found++;
                if (found == count) break;
            }
        }
        return sum;
    }

    private boolean validateAllSums() {
        for (Run run : runs) {
            int sum = 0;
            for (CellCoord c : run.cells) {
                sum += grid[c.row][c.col];
            }
            if (sum != run.targetSum) return false;
        }
        return true;
    }

    // Benchmark statistics accessors
    public int getNodesExplored() { return nodesExplored; }
    public int getBacktracks() { return backtracks; }
    public int[][] getGrid() { return grid; }
}
