package com.queens.admin.application

import com.queens.admin.domain.model.PersistedPuzzle
import com.queens.admin.infrastructure.persistence.PuzzleRepository
import java.time.Instant
import org.springframework.stereotype.Service

@Service
class PuzzleDifficultyBackfillService(
    private val puzzleRepository: PuzzleRepository,
    private val puzzleDifficultyAssessmentService: PuzzleDifficultyAssessmentService,
) {
    data class BackfillSummary(
        val totalPuzzles: Int,
        val assessedCount: Int,
        val easyCount: Int,
        val mediumCount: Int,
        val hardCount: Int,
    )

    fun assessAllPuzzles(): BackfillSummary {
        val puzzles = puzzleRepository.findAll()
        var assessedCount = 0
        var easyCount = 0
        var mediumCount = 0
        var hardCount = 0

        puzzles.forEachIndexed { index, puzzle ->
            val assessment = puzzleDifficultyAssessmentService.assess(puzzle)
            puzzleRepository.updateDifficulty(
                puzzleId = puzzle.id,
                difficultyTier = assessment.difficultyTier,
                difficultyScore = assessment.difficultyScore,
                difficultySolverVersion = PuzzleDifficultyAssessmentService.SOLVER_VERSION,
                difficultyAssessedAt = Instant.now(),
            )
            assessedCount += 1
            when (assessment.difficultyTier) {
                com.queens.admin.domain.model.PuzzleDifficultyTier.EASY -> easyCount += 1
                com.queens.admin.domain.model.PuzzleDifficultyTier.MEDIUM -> mediumCount += 1
                com.queens.admin.domain.model.PuzzleDifficultyTier.HARD -> hardCount += 1
            }

            println(
                "[${index + 1}/${puzzles.size}] ${puzzle.id} size ${puzzle.size} -> ${assessment.difficultyTier.name.lowercase()} " +
                    "(loops=${assessment.loops}, hardBranches=${assessment.hardBranchCount}, unresolved=${assessment.unresolvedSquares})",
            )
        }

        return BackfillSummary(
            totalPuzzles = puzzles.size,
            assessedCount = assessedCount,
            easyCount = easyCount,
            mediumCount = mediumCount,
            hardCount = hardCount,
        )
    }
}
