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
@Order(40)
class FlagAssumptionContradictionRule(
    private val solverSupportService: DeterministicSolverSupportService,
) : SolverRule {
    override val ruleName: String = "flag-assumption-contradiction"
    override val difficultyTier: SolverDifficultyTier = SolverDifficultyTier.MEDIUM

    override fun apply(boardState: BoardState): SolverStep? {
        for (row in 0 until boardState.size) {
            for (col in 0 until boardState.size) {
                if (boardState.cells[row][col].markType != MarkType.NONE) continue
                if (!solverSupportService.isCandidateCell(boardState, row, col)) continue

                val (assumedBoard, _) = solverSupportService.placeFlag(
                    boardState = boardState,
                    row = row,
                    col = col,
                    explanation = "temporary flag assumption",
                )

                if (solverSupportService.hasContradiction(assumedBoard)) {
                    val (updatedBoard, changedCells) = solverSupportService.placeQueen(
                        boardState = boardState,
                        row = row,
                        col = col,
                        explanation = "flag assumption caused contradiction",
                    )
                    return SolverStep(
                        ruleName = ruleName,
                        difficultyTier = difficultyTier,
                        explanation = "Placed a queen at ($row, $col) because flagging it caused a contradiction.",
                        boardState = updatedBoard,
                        changedCells = changedCells,
                    )
                }
            }
        }

        return null
    }
}
