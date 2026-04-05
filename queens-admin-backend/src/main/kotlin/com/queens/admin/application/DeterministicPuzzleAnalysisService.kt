package com.queens.admin.application

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.PuzzleDifficultyTier
import com.queens.admin.domain.model.QueensBoardMetadata
import com.queens.admin.domain.model.QueensRuleset
import com.queens.admin.domain.solver.SolverDifficultyTier
import com.queens.admin.domain.solver.SolverResult
import com.queens.admin.domain.service.DeterministicSolverSupportService
import com.queens.admin.domain.service.SolverEngine
import org.springframework.stereotype.Service

@Service
class DeterministicPuzzleAnalysisService(
    private val solverEngine: SolverEngine,
    private val solverSupportService: DeterministicSolverSupportService,
) {
    data class AnalysisResult(
        val solved: Boolean,
        val difficultyTier: PuzzleDifficultyTier?,
        val hardestTierUsed: SolverDifficultyTier?,
        val stepsTaken: Int,
        val finalQueensPlaced: Int,
        val unresolvedSquares: Int,
        val boardState: BoardState,
        val solverResult: SolverResult,
    )

    fun solve(
        boardState: BoardState,
        maxDifficultyTier: SolverDifficultyTier = SolverDifficultyTier.HARD,
    ): AnalysisResult {
        val clearedBoard = solverEngine.clearSolverMarks(boardState)
        val solverResult = solverEngine.runAllStepsUntilStuck(clearedBoard, maxDifficultyTier = maxDifficultyTier)
        val hardestTierUsed = solverResult.steps
            .map { step -> step.difficultyTier }
            .filter { tier -> tier != SolverDifficultyTier.PRECHECK }
            .maxByOrNull { tier -> tier.rank }

        return AnalysisResult(
            solved = solverResult.solved,
            difficultyTier = hardestTierUsed?.toPuzzleDifficultyTier(),
            hardestTierUsed = hardestTierUsed,
            stepsTaken = solverResult.steps.size,
            finalQueensPlaced = solverSupportService.countPlacedQueens(solverResult.boardState),
            unresolvedSquares = solverResult.boardState.cells.sumOf { row ->
                row.count { cell -> cell.markType == com.queens.admin.domain.model.MarkType.NONE }
            },
            boardState = solverResult.boardState,
            solverResult = solverResult,
        )
    }

    fun assessDifficulty(boardState: BoardState): AnalysisResult {
        val normalizedBoard = boardState.copy(
            metadata = QueensBoardMetadata.metadata(
                boardSize = boardState.size,
                targetQueenCount = QueensBoardMetadata.targetQueenCount(boardState),
                orthogonalMinDistance = QueensBoardMetadata.orthogonalMinDistance(boardState),
            ),
        )
        val easy = solve(normalizedBoard, SolverDifficultyTier.EASY)
        if (easy.solved) return easy.copy(difficultyTier = PuzzleDifficultyTier.EASY)

        val medium = solve(normalizedBoard, SolverDifficultyTier.MEDIUM)
        if (medium.solved) return medium.copy(difficultyTier = PuzzleDifficultyTier.MEDIUM)

        val hard = solve(normalizedBoard, SolverDifficultyTier.HARD)
        if (hard.solved) return hard.copy(difficultyTier = PuzzleDifficultyTier.HARD)

        return hard
    }

    fun withRuleset(boardState: BoardState, ruleset: QueensRuleset, targetQueenCount: Int): BoardState =
        boardState.copy(
            metadata = QueensBoardMetadata.metadata(
                boardSize = boardState.size,
                targetQueenCount = targetQueenCount,
                orthogonalMinDistance = ruleset.orthogonalMinDistance,
            ),
        )
}
