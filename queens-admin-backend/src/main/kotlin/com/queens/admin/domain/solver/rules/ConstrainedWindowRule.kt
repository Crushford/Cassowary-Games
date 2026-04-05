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
@Order(50)
class ConstrainedWindowRule(
    private val solverSupportService: DeterministicSolverSupportService,
) : SolverRule {
    override val ruleName: String = "constrained-window"
    override val difficultyTier: SolverDifficultyTier = SolverDifficultyTier.HARD

    override fun apply(boardState: BoardState): SolverStep? {
        val size = boardState.size
        val windowSize = solverSupportService.ruleset(boardState).orthogonalMinDistance.coerceAtMost(size)
        val groupedPositions = solverSupportService.groupedPositions(boardState)
        if (windowSize <= 0) return null

        for (rowStart in 0 until size) {
            val rowRange = rowStart until (rowStart + windowSize).coerceAtMost(size)
            for (colStart in 0 until size) {
                val colRange = colStart until (colStart + windowSize).coerceAtMost(size)
                val capacity = minOf(rowRange.count(), colRange.count())
                if (capacity <= 0) continue

                val confinedColors = groupedPositions.entries
                    .mapNotNull { (color, positions) ->
                        val candidates = solverSupportService.candidatePositions(boardState, positions)
                        if (candidates.isNotEmpty() &&
                            candidates.all { candidate ->
                                candidate.row in rowRange && candidate.col in colRange
                            }
                        ) {
                            color
                        } else {
                            null
                        }
                    }

                if (confinedColors.size != capacity) continue

                for (row in rowRange) {
                    for (col in colRange) {
                        val cell = boardState.cells[row][col]
                        if (cell.markType != MarkType.NONE) continue
                        if (cell.groupColor == null || cell.groupColor !in confinedColors) {
                            val (updatedBoard, changedCells) = solverSupportService.placeFlag(
                                boardState = boardState,
                                row = row,
                                col = col,
                                explanation = "outside saturated ${windowSize}x${windowSize} constrained window",
                            )
                            return SolverStep(
                                ruleName = ruleName,
                                difficultyTier = difficultyTier,
                                explanation = "Flagged ($row, $col) because rows ${rowRange.first}-${rowRange.last} and cols ${colRange.first}-${colRange.last} are saturated by ${confinedColors.joinToString(", ")}.",
                                boardState = updatedBoard,
                                changedCells = changedCells,
                            )
                        }
                    }
                }
            }
        }

        return null
    }
}
