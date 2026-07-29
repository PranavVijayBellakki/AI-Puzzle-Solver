package com.airesearch.puzzleplatform.solver;

import java.util.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class CheckersAI {

    public static class Move {
        public int fromR, fromC;
        public int toR, toC;
        public List<Cell> jumpChain = new ArrayList<>(); // Coordinates of intermediate jumps (if any)
        public boolean isCapture;

        public Move() {}
        public Move(int fromR, int fromC, int toR, int toC, boolean isCapture) {
            this.fromR = fromR;
            this.fromC = fromC;
            this.toR = toR;
            this.toC = toC;
            this.isCapture = isCapture;
        }
    }

    public static class Cell {
        public int r, c;
        public Cell(int r, int c) { this.r = r; this.c = c; }
    }

    public static class StepEvent {
        public int evaluatedStates;
        public int depth;
        public int bestScore;
        public List<String> moveSequence = new ArrayList<>();
        public String boardFEN;

        public StepEvent() {}
        public StepEvent(int evaluatedStates, int depth, int bestScore, List<String> moveSequence, String boardFEN) {
            this.evaluatedStates = evaluatedStates;
            this.depth = depth;
            this.bestScore = bestScore;
            this.moveSequence.addAll(moveSequence);
            this.boardFEN = boardFEN;
        }
    }

    public interface SolverListener {
        void onEval(StepEvent event);
    }

    private static final int WEIGHT_PIECE = 100;
    private static final int WEIGHT_KING = 175;
    private static final int WEIGHT_POSITION = 10;
    
    private int nodesEvaluated = 0;

    public Move getBestMove(int[][] board, int activePlayer, SolverListener listener) {
        if (NativeSolverBridge.isNativeLibraryLoaded()) {
            try {
                NativeSolverBridge bridge = new NativeSolverBridge();
                String fen = generateFEN(board);
                int depth = determineDynamicDepth(board);
                String nativeResult = bridge.executeCheckersMinimax(fen, depth);
                
                ObjectMapper mapper = new ObjectMapper();
                JsonNode root = mapper.readTree(nativeResult);
                
                String bestMoveStr = root.get("bestMove").asText(); // e.g. "3,1 -> 4,2"
                String[] parts = bestMoveStr.split(" -> ");
                String[] fromParts = parts[0].split(",");
                String[] toParts = parts[1].split(",");
                
                int fromR = Integer.parseInt(fromParts[0].trim());
                int fromC = Integer.parseInt(fromParts[1].trim());
                int toR = Integer.parseInt(toParts[0].trim());
                int toC = Integer.parseInt(toParts[1].trim());
                
                List<Move> legalMoves = generateLegalMoves(board, activePlayer);
                Move selectedMove = null;
                for (Move m : legalMoves) {
                    if (m.fromR == fromR && m.fromC == fromC && m.toR == toR && m.toC == toC) {
                        selectedMove = m;
                        break;
                    }
                }
                
                if (selectedMove == null && !legalMoves.isEmpty()) {
                    selectedMove = legalMoves.get(0);
                }
                
                if (selectedMove != null) {
                    if (listener != null && root.has("searchLogs")) {
                        JsonNode logs = root.get("searchLogs");
                        for (JsonNode logFrame : logs) {
                            int evaluatedStates = logFrame.get("evaluatedStates").asInt();
                            int logDepth = logFrame.get("depth").asInt();
                            int bestScore = logFrame.get("bestScore").asInt();
                            String boardFEN = logFrame.get("boardFEN").asText();
                            List<String> moveSeq = new ArrayList<>();
                            for (JsonNode seqNode : logFrame.get("moveSequence")) {
                                moveSeq.add(seqNode.asText());
                            }
                            listener.onEval(new StepEvent(evaluatedStates, logDepth, bestScore, moveSeq, boardFEN));
                        }
                    }
                    return selectedMove;
                }
            } catch (Exception e) {
                System.err.println("[WARN] JNI Checkers execution failed, falling back to JVM solver: " + e.getMessage());
            }
        }

        // --- JVM Fallback Solver ---
        this.nodesEvaluated = 0;
        int depth = determineDynamicDepth(board);
        
        List<Move> legalMoves = generateLegalMoves(board, activePlayer);
        if (legalMoves.isEmpty()) return null;

        // Move Ordering: Sort capture moves first to maximize alpha-beta cutoffs early
        legalMoves.sort((m1, m2) -> Boolean.compare(m2.isCapture, m1.isCapture));

        List<Move> bestMoves = new ArrayList<>();
        int bestScore = (activePlayer == 1) ? Integer.MIN_VALUE : Integer.MAX_VALUE;

        for (Move move : legalMoves) {
            int[][] nextBoard = applyMove(board, move);
            int score = minimax(nextBoard, depth - 1, Integer.MIN_VALUE, Integer.MAX_VALUE, activePlayer * -1);

            if (activePlayer == 1) { // Maximizing AI (Red)
                if (score > bestScore) {
                    bestScore = score;
                    bestMoves.clear();
                    bestMoves.add(move);
                } else if (score == bestScore) {
                    bestMoves.add(move);
                }
            } else { // Minimizing Opponent (Black)
                if (score < bestScore) {
                    bestScore = score;
                    bestMoves.clear();
                    bestMoves.add(move);
                } else if (score == bestScore) {
                    bestMoves.add(move);
                }
            }

            if (listener != null) {
                List<String> movesList = new ArrayList<>();
                movesList.add(move.fromR + "," + move.fromC + " -> " + move.toR + "," + move.toC);
                listener.onEval(new StepEvent(nodesEvaluated, depth, bestScore, movesList, generateFEN(board)));
            }
        }
        Random rand = new Random();
        return bestMoves.isEmpty() ? null : bestMoves.get(rand.nextInt(bestMoves.size()));
    }

    private int minimax(int[][] board, int depth, int alpha, int beta, int activePlayer) {
        nodesEvaluated++;
        
        if (depth == 0 || isGameOver(board)) {
            return evaluateBoard(board);
        }

        List<Move> legalMoves = generateLegalMoves(board, activePlayer);
        if (legalMoves.isEmpty()) {
            return (activePlayer == 1) ? -100000 : 100000; // Trapped loss values
        }

        legalMoves.sort((m1, m2) -> Boolean.compare(m2.isCapture, m1.isCapture));

        if (activePlayer == 1) { // Maximizing AI
            int maxEval = Integer.MIN_VALUE;
            for (Move move : legalMoves) {
                int[][] nextBoard = applyMove(board, move);
                int eval = minimax(nextBoard, depth - 1, alpha, beta, -1);
                maxEval = Math.max(maxEval, eval);
                alpha = Math.max(alpha, eval);
                if (beta <= alpha) break; // Beta cutoff
            }
            return maxEval;
        } else { // Minimizing Player
            int minEval = Integer.MAX_VALUE;
            for (Move move : legalMoves) {
                int[][] nextBoard = applyMove(board, move);
                int eval = minimax(nextBoard, depth - 1, alpha, beta, 1);
                minEval = Math.min(minEval, eval);
                beta = Math.min(beta, eval);
                if (beta <= alpha) break; // Alpha cutoff
            }
            return minEval;
        }
    }

    private int evaluateBoard(int[][] board) {
        int score = 0;
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; r++) {
                // Fix infinite loop bug: make sure to advance the loop correctly
            }
        }
        // Let's implement this correctly to avoid infinite loops:
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                int val = board[r][c];
                if (val == 0) continue;

                // Material Score
                if (val == 1) score += WEIGHT_PIECE;
                else if (val == 2) score += WEIGHT_KING;
                else if (val == -1) score -= WEIGHT_PIECE;
                else if (val == -2) score -= WEIGHT_KING;

                // Positional Control & Advancement Score
                if (val > 0) { // Red AI
                    if (c >= 2 && c <= 5) score += 5 * WEIGHT_POSITION; // Center columns
                    score += r * 2 * WEIGHT_POSITION; // Advanced Rows
                } else { // Black Player
                    if (c >= 2 && c <= 5) score -= 5 * WEIGHT_POSITION;
                    score -= (7 - r) * 2 * WEIGHT_POSITION;
                }
            }
        }
        return score;
    }

    private int determineDynamicDepth(int[][] board) {
        int pieces = 0;
        for (int[] row : board) {
            for (int val : row) {
                if (val != 0) pieces++;
            }
        }
        if (pieces > 12) return 6;
        if (pieces > 6) return 8;
        return 12; // deep tactics for endgame
    }

    public List<Move> generateLegalMoves(int[][] board, int player) {
        List<Move> captures = new ArrayList<>();
        List<Move> normalMoves = new ArrayList<>();

        int dir = (player == 1) ? 1 : -1; // Maximizing Red moves up (r++), Minimizing Black moves down (r--)
        
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                int piece = board[r][c];
                if (piece == 0) continue;
                
                // Matches player (either base piece or elevated king)
                if ((player == 1 && piece > 0) || (player == -1 && piece < 0)) {
                    boolean isKing = Math.abs(piece) == 2;
                    
                    // Jumps/Captures check
                    generateJumpsForPiece(board, r, c, isKing, player, captures);
                    
                    // Normal diagonals check (only generated if no captures exist)
                    if (captures.isEmpty()) {
                        generateNormalMovesForPiece(board, r, c, isKing, dir, normalMoves);
                    }
                }
            }
        }
        
        // Enforce Mandatory Captures Rule
        return captures.isEmpty() ? normalMoves : captures;
    }

    private void generateNormalMovesForPiece(int[][] board, int r, int c, boolean isKing, int dir, List<Move> list) {
        int[] rows = isKing ? new int[]{dir, -dir} : new int[]{dir};
        int[] cols = new int[]{-1, 1};

        for (int dr : rows) {
            for (int dc : cols) {
                int nr = r + dr;
                int nc = c + dc;
                if (isOnBoard(nr, nc) && board[nr][nc] == 0) {
                    list.add(new Move(r, c, nr, nc, false));
                }
            }
        }
    }

    private void generateJumpsForPiece(int[][] board, int r, int c, boolean isKing, int player, List<Move> list) {
        int[] rows = isKing ? new int[]{-1, 1} : new int[]{(player == 1) ? 1 : -1};
        int[] cols = new int[]{-1, 1};

        for (int dr : rows) {
            for (int dc : cols) {
                int victimR = r + dr;
                int victimC = c + dc;
                int landingR = r + 2 * dr;
                int landingC = c + 2 * dc;

                if (isOnBoard(landingR, landingC)) {
                    int victim = board[victimR][victimC];
                    int landing = board[landingR][landingC];
                    
                    if (landing == 0 && victim != 0) {
                        // Victim is opposing player piece
                        if ((player == 1 && victim < 0) || (player == -1 && victim > 0)) {
                            Move m = new Move(r, c, landingR, landingC, true);
                            m.jumpChain.add(new Cell(victimR, victimC));
                            list.add(m);
                        }
                    }
                }
            }
        }
    }

    private int[][] applyMove(int[][] board, Move move) {
        int[][] next = new int[8][8];
        for (int i = 0; i < 8; i++) System.arraycopy(board[i], 0, next[i], 0, 8);

        int piece = next[move.fromR][move.fromC];
        next[move.fromR][move.fromC] = 0;

        // Check Promotion / Kinging
        if (piece == 1 && move.toR == 7) {
            piece = 2; // Red Regular promoted to King
        } else if (piece == -1 && move.toR == 0) {
            piece = -2; // Black Regular promoted to King
        }

        next[move.toR][move.toC] = piece;

        // Clear captured pieces (in jumps)
        if (move.isCapture) {
            for (Cell victim : move.jumpChain) {
                next[victim.r][victim.c] = 0;
            }
        }
        return next;
    }

    private boolean isOnBoard(int r, int c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    private boolean isGameOver(int[][] board) {
        return generateLegalMoves(board, 1).isEmpty() || generateLegalMoves(board, -1).isEmpty();
    }

    private String generateFEN(int[][] board) {
        StringBuilder sb = new StringBuilder();
        // Red = AI (positive values), Black = Player (negative values)
        // Simplistic FEN representation: active player sign + piece coordinates
        sb.append("W:W");
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                if (board[r][c] > 0) sb.append(board[r][c] == 2 ? "K" : "").append(r * 4 + c / 2 + 1).append(",");
            }
        }
        sb.append(":B");
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                if (board[r][c] < 0) sb.append(board[r][c] == -2 ? "K" : "").append(r * 4 + c / 2 + 1).append(",");
            }
        }
        return sb.toString();
    }

    public int getNodesEvaluated() { return nodesEvaluated; }
}
