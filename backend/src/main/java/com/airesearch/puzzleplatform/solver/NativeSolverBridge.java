package com.airesearch.puzzleplatform.solver;

import org.springframework.stereotype.Service;

@Service
public class NativeSolverBridge {
    
    private static boolean nativeLibraryLoaded = false;

    static {
        try {
            System.loadLibrary("native_solver_core");
            nativeLibraryLoaded = true;
            System.out.println("[INFO] Successfully loaded native solver library 'native_solver_core'.");
        } catch (UnsatisfiedLinkError | SecurityException e) {
            System.err.println("[WARN] Native solver library 'native_solver_core' not found or failed to load. Using pure JVM fallback solver.");
            nativeLibraryLoaded = false;
        }
    }

    public static boolean isNativeLibraryLoaded() {
        return nativeLibraryLoaded;
    }

    /**
     * Executes deep-search Minimax calculations with Alpha-Beta pruning via C++.
     * @param boardFEN String representation of board state.
     * @param maxDepth Core search horizon threshold.
     * @return Formatted JSON string tracking best move sequence and telemetry array.
     */
    public native String executeCheckersMinimax(String boardFEN, int maxDepth);

    /**
     * Executes a combinatoric backtracking puzzle evaluation for Kakuro constraints.
     * @param structuralJson Configuration matrix details and constraints.
     * @return Execution logs and state evaluations.
     */
    public native String executeKakuroSolver(String structuralJson);
}
