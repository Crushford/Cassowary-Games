package com.queens.admin.application

import com.queens.admin.domain.model.PersistedPuzzle
import com.queens.admin.domain.model.PuzzleDifficultyTier
import com.queens.admin.domain.model.QueensRuleset
import com.queens.admin.domain.service.PersistedPuzzleBoardCodecService
import org.springframework.stereotype.Service

@Service
class PuzzleDifficultyAssessmentService(
    private val persistedPuzzleBoardCodecService: PersistedPuzzleBoardCodecService,
    private val deterministicPuzzleAnalysisService: DeterministicPuzzleAnalysisService,
) {
    companion object {
        const val SOLVER_VERSION = "difficulty-v1"
    }

    data class AssessmentResult(
        val puzzleId: java.util.UUID,
        val difficultyTier: PuzzleDifficultyTier,
        val difficultyScore: Int,
        val loops: Int,
        val hardBranchCount: Int,
        val finalQueensPlaced: Int,
        val unresolvedSquares: Int,
    )

    fun assess(
        puzzle: PersistedPuzzle,
        ruleset: QueensRuleset = QueensRuleset.classic(puzzle.size),
    ): AssessmentResult {
        val boardState = deterministicPuzzleAnalysisService.withRuleset(
            boardState = persistedPuzzleBoardCodecService.decode(puzzle),
            ruleset = ruleset,
            targetQueenCount = puzzle.targetQueenCount,
        )
        val analysis = deterministicPuzzleAnalysisService.assessDifficulty(boardState)
        require(analysis.solved) {
            "Difficulty assessor could not solve puzzle ${puzzle.id} (size ${puzzle.size})."
        }

        val tier = analysis.difficultyTier ?: PuzzleDifficultyTier.HARD
        return AssessmentResult(
            puzzleId = puzzle.id,
            difficultyTier = tier,
            difficultyScore = tier.score,
            loops = analysis.stepsTaken,
            hardBranchCount = 0,
            finalQueensPlaced = analysis.finalQueensPlaced,
            unresolvedSquares = analysis.unresolvedSquares,
        )
    }
}
