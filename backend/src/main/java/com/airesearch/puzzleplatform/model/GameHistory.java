package com.airesearch.puzzleplatform.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "game_history")
public class GameHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "game_type", nullable = false)
    private String gameType; // 'SUDOKU', 'KAKURO', 'CHECKERS'

    @Column(nullable = false)
    private String result; // 'SOLVED', 'FAILED', 'DRAW', 'WIN', 'LOSS'

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private String moves; // Raw serialized JSON string containing step arrays

    @Column(name = "time_taken_ms", nullable = false)
    private Long timeTakenMs;

    @Column(name = "nodes_explored", nullable = false)
    private Long nodesExplored;

    @Column(name = "backtracks", nullable = false)
    private Long backtracks;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    // Default Constructor
    public GameHistory() {}

    // Convenience Constructor
    public GameHistory(User user, String gameType, String result, String moves, Long timeTakenMs, Long nodesExplored, Long backtracks) {
        this.user = user;
        this.gameType = gameType;
        this.result = result;
        this.moves = moves;
        this.timeTakenMs = timeTakenMs;
        this.nodesExplored = nodesExplored;
        this.backtracks = backtracks;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getGameType() {
        return gameType;
    }

    public void setGameType(String gameType) {
        this.gameType = gameType;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public String getMoves() {
        return moves;
    }

    public void setMoves(String moves) {
        this.moves = moves;
    }

    public Long getTimeTakenMs() {
        return timeTakenMs;
    }

    public void setTimeTakenMs(Long timeTakenMs) {
        this.timeTakenMs = timeTakenMs;
    }

    public Long getNodesExplored() {
        return nodesExplored;
    }

    public void setNodesExplored(Long nodesExplored) {
        this.nodesExplored = nodesExplored;
    }

    public Long getBacktracks() {
        return backtracks;
    }

    public void setBacktracks(Long backtracks) {
        this.backtracks = backtracks;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
