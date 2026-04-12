package com.queens.admin.domain.solver.rules

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.ChangedCell
import com.queens.admin.domain.solver.SolverDifficultyTier
import com.queens.admin.domain.solver.SolverRule
import com.queens.admin.domain.solver.SolverStep
import com.queens.admin.domain.service.DeterministicSolverSupportService
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

@Component
@Order(25)
class GroupConfinedToLineRule(
    private val solverSupportService: DeterministicSolverSupportService,
) : SolverRule {
    override val ruleName: String = "group-confined-to-line"
    override val difficultyTier: SolverDifficultyTier = SolverDifficultyTier.EASY

    override fun apply(boardState: BoardState): SolverStep? {
        var updatedBoard = boardState
        val changedCells = mutableListOf<ChangedCell>()
        var triggeredGroups = 0
        val requiredDistance = solverSupportService.ruleset(boardState).orthogonalMinDistance

        for ((color, positions) in solverSupportService.groupedPositions(updatedBoard)) {
            val queensInGroup = positions.count { position ->
                updatedBoard.cells[position.row][position.col].markType == com.queens.admin.domain.model.MarkType.QUEEN
            }
            if (queensInGroup >= 1) continue

            val candidates = solverSupportService.candidatePositions(updatedBoard, positions)
            if (candidates.size <= 1) continue

            val confinedRow = candidates.first().row.takeIf { row -> candidates.all { it.row == row } }
            val confinedCol = candidates.first().col.takeIf { col -> candidates.all { it.col == col } }

            if (confinedRow != null) {
                val minCol = candidates.minOf { it.col }
                val maxCol = candidates.maxOf { it.col }
                val reservedWidth = maxCol - minCol + 1
                val flagRadius = requiredDistance - reservedWidth
                if (flagRadius > 0) {
                    val rowChanges = mutableListOf<ChangedCell>()
                    val leftStart = maxOf(0, minCol - flagRadius)
                    val rightEnd = minOf(updatedBoard.size - 1, maxCol + flagRadius)
                    val pluralSuffix = if (flagRadius == 1) "" else "s"

                    for (col in leftStart..rightEnd) {
                        if (col in minCol..maxCol) continue
                        val cell = updatedBoard.cells[confinedRow][col]
                        if (cell.groupColor == color) continue
                        if (!solverSupportService.isCandidateCell(updatedBoard, confinedRow, col)) continue

                        val (nextBoard, nextChanges) = solverSupportService.placeFlag(
                            boardState = updatedBoard,
                            row = confinedRow,
                            col = col,
                            explanation =
                                "color group $color is confined to row $confinedRow, reserving " +
                                    "$flagRadius square$pluralSuffix on each side",
                            changeType = "SOLVER_GROUP_CONFINED_ROW_FLAG",
                        )
                        updatedBoard = nextBoard
                        rowChanges += nextChanges
                    }

                    if (rowChanges.isNotEmpty()) {
                        changedCells += rowChanges
                        triggeredGroups += 1
                    }
                }
            }

            if (confinedCol != null) {
                val minRow = candidates.minOf { it.row }
                val maxRow = candidates.maxOf { it.row }
                val reservedHeight = maxRow - minRow + 1
                val flagRadius = requiredDistance - reservedHeight
                if (flagRadius > 0) {
                    val colChanges = mutableListOf<ChangedCell>()
                    val topStart = maxOf(0, minRow - flagRadius)
                    val bottomEnd = minOf(updatedBoard.size - 1, maxRow + flagRadius)
                    val pluralSuffix = if (flagRadius == 1) "" else "s"

                    for (row in topStart..bottomEnd) {
                        if (row in minRow..maxRow) continue
                        val cell = updatedBoard.cells[row][confinedCol]
                        if (cell.groupColor == color) continue
                        if (!solverSupportService.isCandidateCell(updatedBoard, row, confinedCol)) continue

                        val (nextBoard, nextChanges) = solverSupportService.placeFlag(
                            boardState = updatedBoard,
                            row = row,
                            col = confinedCol,
                            explanation =
                                "color group $color is confined to column $confinedCol, reserving " +
                                    "$flagRadius square$pluralSuffix on each side",
                            changeType = "SOLVER_GROUP_CONFINED_COLUMN_FLAG",
                        )
                        updatedBoard = nextBoard
                        colChanges += nextChanges
                    }

                    if (colChanges.isNotEmpty()) {
                        changedCells += colChanges
                        triggeredGroups += 1
                    }
                }
            }
        }

        if (changedCells.isEmpty()) return null

        return SolverStep(
            ruleName = ruleName,
            difficultyTier = difficultyTier,
            explanation =
                "Flagged ${changedCells.size} square${if (changedCells.size == 1) "" else "s"} " +
                    "because $triggeredGroups color group${if (triggeredGroups == 1) "" else "s"} " +
                    "were confined to a single row or column.",
            boardState = updatedBoard,
            changedCells = changedCells,
        )
    }
}
