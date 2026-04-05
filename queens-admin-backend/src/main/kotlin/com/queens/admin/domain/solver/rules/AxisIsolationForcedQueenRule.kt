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
@Order(20)
class AxisIsolationForcedQueenRule(
    private val solverSupportService: DeterministicSolverSupportService,
) : SolverRule {
    override val ruleName: String = "axis-isolation-forced-queen"
    override val difficultyTier: SolverDifficultyTier = SolverDifficultyTier.EASY

    override fun apply(boardState: BoardState): SolverStep? {
        for (row in 0 until boardState.size) {
            for (col in 0 until boardState.size) {
                if (boardState.cells[row][col].markType != MarkType.NONE) continue
                if (!solverSupportService.isCandidateCell(boardState, row, col)) continue

                if (forcedByAxisIsolation(boardState, row, col, horizontal = true) ||
                    forcedByAxisIsolation(boardState, row, col, horizontal = false)
                ) {
                    val axisLabel = if (forcedByAxisIsolation(boardState, row, col, horizontal = true)) {
                        "horizontal"
                    } else {
                        "vertical"
                    }
                    val (updatedBoard, changedCells) = solverSupportService.placeQueen(
                        boardState = boardState,
                        row = row,
                        col = col,
                        explanation = "forced by $axisLabel isolation",
                    )
                    return SolverStep(
                        ruleName = ruleName,
                        difficultyTier = difficultyTier,
                        explanation = "Placed a queen at ($row, $col) because $axisLabel spacing isolation forced it.",
                        boardState = updatedBoard,
                        changedCells = changedCells,
                    )
                }
            }
        }

        return null
    }

    private fun forcedByAxisIsolation(
        boardState: BoardState,
        row: Int,
        col: Int,
        horizontal: Boolean,
    ): Boolean {
        val required = solverSupportService.ruleset(boardState).orthogonalMinDistance
        return blockedOrEdgeSupport(boardState, row, col, horizontal, negative = true, required = required) >= required &&
            blockedOrEdgeSupport(boardState, row, col, horizontal, negative = false, required = required) >= required
    }

    private fun blockedOrEdgeSupport(
        boardState: BoardState,
        row: Int,
        col: Int,
        horizontal: Boolean,
        negative: Boolean,
        required: Int,
    ): Int {
        var support = 0
        var currentRow = row
        var currentCol = col

        while (support < required) {
            if (horizontal) {
                currentCol += if (negative) -1 else 1
            } else {
                currentRow += if (negative) -1 else 1
            }

            if (currentRow !in 0 until boardState.size || currentCol !in 0 until boardState.size) {
                support += 1
                continue
            }

            val mark = boardState.cells[currentRow][currentCol].markType
            if (mark == MarkType.FLAG || mark == MarkType.INVALID) {
                support += 1
            } else {
                break
            }
        }

        return support
    }
}
