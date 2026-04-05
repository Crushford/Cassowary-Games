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
@Order(0)
class FlagSquaresWithoutColorGroupsRule(
    private val solverSupportService: DeterministicSolverSupportService,
) : SolverRule {
    override val ruleName: String = "flag-squares-without-color-groups"
    override val difficultyTier: SolverDifficultyTier = SolverDifficultyTier.PRECHECK

    override fun apply(boardState: BoardState): SolverStep? {
        for (row in 0 until boardState.size) {
            for (col in 0 until boardState.size) {
                val cell = boardState.cells[row][col]
                if (cell.groupColor != null || cell.markType != MarkType.NONE) continue

                val (updatedBoard, changedCells) = solverSupportService.placeFlag(
                    boardState = boardState,
                    row = row,
                    col = col,
                    explanation = "square is not part of any color group",
                    changeType = "SOLVER_INVALIDATED",
                )
                return SolverStep(
                    ruleName = ruleName,
                    difficultyTier = difficultyTier,
                    explanation = "Flagged one uncolored square before deterministic solving.",
                    boardState = updatedBoard,
                    changedCells = changedCells,
                )
            }
        }

        return null
    }
}
