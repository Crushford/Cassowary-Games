package com.queens.admin.domain.solver.rules

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.solver.SolverDifficultyTier
import com.queens.admin.domain.solver.SolverRule
import com.queens.admin.domain.solver.SolverStep
import com.queens.admin.domain.service.DeterministicSolverSupportService
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

@Component
@Order(15)
class ForcedCoverageQueenRule(
    private val solverSupportService: DeterministicSolverSupportService,
) : SolverRule {
    override val ruleName: String = "forced-coverage-queen"
    override val difficultyTier: SolverDifficultyTier = SolverDifficultyTier.EASY

    override fun apply(boardState: BoardState): SolverStep? {
        val ruleset = solverSupportService.ruleset(boardState)

        if (ruleset.requireRowCoverage) {
            for (row in 0 until boardState.size) {
                val queensInRow = (0 until boardState.size)
                    .count { col -> boardState.cells[row][col].markType == MarkType.QUEEN }
                if (queensInRow >= 1) continue
                val candidates = (0 until boardState.size)
                    .filter { col -> solverSupportService.isCandidateCell(boardState, row, col) }
                if (candidates.size == 1) {
                    val col = candidates.single()
                    val (updatedBoard, changedCells) = solverSupportService.placeQueen(
                        boardState = boardState,
                        row = row,
                        col = col,
                        explanation = "only remaining candidate in required row $row",
                    )
                    return SolverStep(
                        ruleName = ruleName,
                        difficultyTier = difficultyTier,
                        explanation = "Placed a queen because row $row had exactly one remaining candidate.",
                        boardState = updatedBoard,
                        changedCells = changedCells,
                    )
                }
            }
        }

        if (ruleset.requireColumnCoverage) {
            for (col in 0 until boardState.size) {
                val queensInColumn = (0 until boardState.size)
                    .count { row -> boardState.cells[row][col].markType == MarkType.QUEEN }
                if (queensInColumn >= 1) continue
                val candidates = (0 until boardState.size)
                    .filter { row -> solverSupportService.isCandidateCell(boardState, row, col) }
                if (candidates.size == 1) {
                    val row = candidates.single()
                    val (updatedBoard, changedCells) = solverSupportService.placeQueen(
                        boardState = boardState,
                        row = row,
                        col = col,
                        explanation = "only remaining candidate in required column $col",
                    )
                    return SolverStep(
                        ruleName = ruleName,
                        difficultyTier = difficultyTier,
                        explanation = "Placed a queen because column $col had exactly one remaining candidate.",
                        boardState = updatedBoard,
                        changedCells = changedCells,
                    )
                }
            }
        }

        return null
    }
}
