package com.airesearch.puzzleplatform.repository;

import com.airesearch.puzzleplatform.model.SavedPuzzle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface SavedPuzzleRepository extends JpaRepository<SavedPuzzle, UUID> {
    List<SavedPuzzle> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
