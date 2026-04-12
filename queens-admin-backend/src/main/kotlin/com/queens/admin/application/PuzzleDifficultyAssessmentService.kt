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
        const val SOLVER_VERSION = "difficulty-v4"
    }

    data class AssessmentResult(
        val puzzleId: java.util.UUID,
        val difficultyTier: PuzzleDifficultyTier,
        val difficultyScore: Int,
        val loops: Int,
        val hardBranchCount: Int,
        val finalQueensPlaced: Int,
        val unresolvedSquares: Int,
        val solved: Boolean,
        val hardestStepTier: String?,
    )

    fun assess(
        puzzle: PersistedPuzzle,
        ruleset: QueensRuleset = QueensRuleset(
            orthogonalMinDistance = puzzle.orthogonalMinDistance,
            requireRowCoverage = false,
            requireColumnCoverage = false,
        ),
    ): AssessmentResult {
        val boardState = deterministicPuzzleAnalysisService.withRuleset(
            boardState = persistedPuzzleBoardCodecService.decode(puzzle),
            ruleset = ruleset,
            targetQueenCount = puzzle.targetQueenCount,
        )
        val analysis = deterministicPuzzleAnalysisService.assessDifficulty(boardState)
        val tier = analysis.difficultyTier ?: PuzzleDifficultyTier.UNSOLVABLE
        return AssessmentResult(
            puzzleId = puzzle.id,
            difficultyTier = tier,
            difficultyScore = tier.score,
            loops = analysis.stepsTaken,
            hardBranchCount = 0,
            finalQueensPlaced = analysis.finalQueensPlaced,
            unresolvedSquares = analysis.unresolvedSquares,
            solved = analysis.solved,
            hardestStepTier = analysis.hardestTierUsed?.name,
        )
    }
}
