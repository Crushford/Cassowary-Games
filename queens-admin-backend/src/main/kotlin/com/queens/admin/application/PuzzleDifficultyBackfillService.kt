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
    data class BackfillOptions(
        val overwriteExisting: Boolean = false,
    )

    data class BackfillProgress(
        val processedCount: Int,
        val totalToProcess: Int,
        val remainingCount: Int,
        val easyCount: Int,
        val mediumCount: Int,
        val hardCount: Int,
        val extraHardCount: Int,
        val unsolvableCount: Int,
        val puzzle: PersistedPuzzle,
        val assessedTier: com.queens.admin.domain.model.PuzzleDifficultyTier,
    )

    data class BackfillSummary(
        val totalPuzzlesInDatabase: Int,
        val totalToProcess: Int,
        val assessedCount: Int,
        val skippedExistingCount: Int,
        val easyCount: Int,
        val mediumCount: Int,
        val hardCount: Int,
        val extraHardCount: Int,
        val unsolvableCount: Int,
    )

    fun assessAllPuzzles(
        options: BackfillOptions = BackfillOptions(),
        progressListener: ((BackfillProgress) -> Unit)? = null,
    ): BackfillSummary {
        val allPuzzles = puzzleRepository.findAll()
        val puzzles = if (options.overwriteExisting) allPuzzles else puzzleRepository.findAllWithoutDifficulty()
        val totalPuzzlesInDatabase = allPuzzles.size
        val totalToProcess = puzzles.size
        var assessedCount = 0
        var easyCount = 0
        var mediumCount = 0
        var hardCount = 0
        var extraHardCount = 0
        var unsolvableCount = 0

        puzzles.forEach { puzzle ->
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
                com.queens.admin.domain.model.PuzzleDifficultyTier.EXTRA_HARD -> extraHardCount += 1
                com.queens.admin.domain.model.PuzzleDifficultyTier.UNSOLVABLE -> unsolvableCount += 1
            }

            progressListener?.invoke(
                BackfillProgress(
                    processedCount = assessedCount,
                    totalToProcess = totalToProcess,
                    remainingCount = totalToProcess - assessedCount,
                    easyCount = easyCount,
                    mediumCount = mediumCount,
                    hardCount = hardCount,
                    extraHardCount = extraHardCount,
                    unsolvableCount = unsolvableCount,
                    puzzle = puzzle,
                    assessedTier = assessment.difficultyTier,
                ),
            )
        }

        return BackfillSummary(
            totalPuzzlesInDatabase = totalPuzzlesInDatabase,
            totalToProcess = totalToProcess,
            assessedCount = assessedCount,
            skippedExistingCount = totalPuzzlesInDatabase - totalToProcess,
            easyCount = easyCount,
            mediumCount = mediumCount,
            hardCount = hardCount,
            extraHardCount = extraHardCount,
            unsolvableCount = unsolvableCount,
        )
    }
}
