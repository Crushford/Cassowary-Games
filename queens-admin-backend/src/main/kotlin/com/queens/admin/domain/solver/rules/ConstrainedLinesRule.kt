package com.queens.admin.domain.solver.rules

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.ChangedCell
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.solver.SolverDifficultyTier
import com.queens.admin.domain.solver.SolverRule
import com.queens.admin.domain.solver.SolverStep
import com.queens.admin.domain.service.DeterministicSolverSupportService
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

@Component
@Order(30)
class ConstrainedLinesRule(
    private val solverSupportService: DeterministicSolverSupportService,
) : SolverRule {
    override val ruleName: String = "constrained-lines"
    override val difficultyTier: SolverDifficultyTier = SolverDifficultyTier.MEDIUM

    override fun apply(boardState: BoardState): SolverStep? {
        findConstrainedBand(boardState, isColumn = false)?.let { return it }
        findConstrainedBand(boardState, isColumn = true)?.let { return it }
        return null
    }

    private fun findConstrainedBand(boardState: BoardState, isColumn: Boolean): SolverStep? {
        val size = boardState.size
        val distance = solverSupportService.ruleset(boardState).orthogonalMinDistance.coerceAtMost(size)
        val groupedPositions = solverSupportService.groupedPositions(boardState)
        val axisLabel = if (isColumn) "column" else "row"
        val windowLabel = if (isColumn) "rows" else "cols"

        if (distance <= 0) return null

        for (bandSize in 2..size) {
            val primaryLimit = size - bandSize
            val secondaryLimit = size - distance
            if (primaryLimit < 0 || secondaryLimit < 0) continue

            for (primaryStart in 0..primaryLimit) {
                val primaryRange = primaryStart until (primaryStart + bandSize)

                for (secondaryStart in 0..secondaryLimit) {
                    val secondaryRange = secondaryStart until (secondaryStart + distance)
                    val confinedColors = groupedPositions.entries.mapNotNull { (color, positions) ->
                        val queensInGroup = positions.count { position ->
                            boardState.cells[position.row][position.col].markType == MarkType.QUEEN
                        }
                        if (queensInGroup >= 1) {
                            return@mapNotNull null
                        }

                        val candidates = solverSupportService.candidatePositions(boardState, positions)
                        if (candidates.isEmpty()) {
                            return@mapNotNull null
                        }

                        val insideBand = candidates.all { candidate ->
                            val primaryCoordinate = if (isColumn) candidate.col else candidate.row
                            val secondaryCoordinate = if (isColumn) candidate.row else candidate.col
                            primaryCoordinate in primaryRange && secondaryCoordinate in secondaryRange
                        }

                        color.takeIf { insideBand }
                    }

                    if (confinedColors.size != bandSize) continue

                    var updatedBoard = boardState
                    val changedCells = mutableListOf<ChangedCell>()
                    for (primary in primaryRange) {
                        for (secondary in secondaryRange) {
                            val row = if (isColumn) secondary else primary
                            val col = if (isColumn) primary else secondary
                            val cell = updatedBoard.cells[row][col]
                            if (cell.markType != MarkType.NONE) continue
                            if (cell.groupColor == null || cell.groupColor in confinedColors) continue
                            if (!solverSupportService.isCandidateCell(updatedBoard, row, col)) continue

                            val (nextBoard, nextChanges) = solverSupportService.placeFlag(
                                boardState = updatedBoard,
                                row = row,
                                col = col,
                                explanation =
                                    "outside confined $axisLabel band ${primaryRange.first}-${primaryRange.last} " +
                                        "within $windowLabel ${secondaryRange.first}-${secondaryRange.last} " +
                                        "reserved for colors ${confinedColors.sorted().joinToString(", ")}",
                                changeType = "SOLVER_CONSTRAINED_${axisLabel.uppercase()}_FLAG",
                            )
                            updatedBoard = nextBoard
                            changedCells += nextChanges
                        }
                    }

                    if (changedCells.isNotEmpty()) {
                        return SolverStep(
                            ruleName = ruleName,
                            difficultyTier = difficultyTier,
                            explanation =
                                "Flagged ${changedCells.size} square${if (changedCells.size == 1) "" else "s"} " +
                                    "using constrained $axisLabel band ${primaryRange.first}-${primaryRange.last} " +
                                    "within $windowLabel ${secondaryRange.first}-${secondaryRange.last} for colors " +
                                    confinedColors.sorted().joinToString(", ") + ".",
                            boardState = updatedBoard,
                            changedCells = changedCells,
                        )
                    }
                }
            }
        }

        return null
    }
}
