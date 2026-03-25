package com.queens.admin.domain.solver.rules

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.ChangedCell
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.solver.SolverRule
import com.queens.admin.domain.solver.SolverStep
import org.springframework.stereotype.Component

@Component
class FlagSquaresWithoutColorGroupsRule : SolverRule {
    override val ruleName: String = "flag-squares-without-color-groups"

    override fun apply(boardState: BoardState): SolverStep? {
        boardState.cells.forEachIndexed { rowIndex, row ->
            row.forEachIndexed { colIndex, cell ->
                if (cell.groupColor == null && cell.markType == MarkType.NONE) {
                    val updatedRows = boardState.cells.mapIndexed { candidateRowIndex, candidateRow ->
                        candidateRow.mapIndexed { candidateColIndex, candidateCell ->
                            if (candidateRowIndex == rowIndex && candidateColIndex == colIndex) {
                                candidateCell.copy(markType = MarkType.INVALID)
                            } else {
                                candidateCell
                            }
                        }
                    }

                    return SolverStep(
                        ruleName = ruleName,
                        explanation = "Flagged one ungrouped square as invalid for the current puzzle state.",
                        boardState = boardState.copy(cells = updatedRows),
                        changedCells = listOf(
                            ChangedCell(
                                row = rowIndex,
                                col = colIndex,
                                changeType = "SOLVER_INVALIDATED",
                                explanation = "no color group on this square",
                            ),
                        ),
                    )
                }
            }
        }

        return null
    }
}
