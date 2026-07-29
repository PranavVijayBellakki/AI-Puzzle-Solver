package com.airesearch.puzzleplatform.repository;

import com.airesearch.puzzleplatform.model.GameHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface GameHistoryRepository extends JpaRepository<GameHistory, UUID> {
    
    // Retrieve historical solves for a specific user ordered by newest
    List<GameHistory> findByUserIdOrderByCreatedAtDesc(UUID userId);
    
    // Retrieve the fastest successful solves ('SOLVED') for a game type (Leaderboard query)
    @Query("SELECT gh FROM GameHistory gh WHERE gh.gameType = :gameType AND gh.result = 'SOLVED' ORDER BY gh.timeTakenMs ASC")
    List<GameHistory> findTopSolvedByGameTypeOrderByTimeTakenMs(@Param("gameType") String gameType);
}
