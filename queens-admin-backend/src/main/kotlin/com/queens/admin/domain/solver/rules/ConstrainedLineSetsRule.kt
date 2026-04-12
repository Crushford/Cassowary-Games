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
@Order(31)
class ConstrainedLineSetsRule(
    private val solverSupportService: DeterministicSolverSupportService,
) : SolverRule {
    override val ruleName: String = "constrained-line-sets"
    override val difficultyTier: SolverDifficultyTier = SolverDifficultyTier.EXTRA_HARD

    override fun apply(boardState: BoardState): SolverStep? {
        findConstrainedLineSet(boardState, isColumn = false)?.let { return it }
        findConstrainedLineSet(boardState, isColumn = true)?.let { return it }
        return null
    }

    private fun findConstrainedLineSet(boardState: BoardState, isColumn: Boolean): SolverStep? {
        val size = boardState.size
        val distance = solverSupportService.ruleset(boardState).orthogonalMinDistance.coerceAtMost(size)
        if (distance <= 0 || size < 2) return null

        val groupedPositions = solverSupportService.groupedPositions(boardState)
        val axisLabel = if (isColumn) "column" else "row"
        val windowLabel = if (isColumn) "rows" else "cols"
        val secondaryLimit = size - distance
        if (secondaryLimit < 0) return null

        for (lineCount in 2..size) {
            for (selectedLines in lineCombinations(size, lineCount)) {
                if (selectedLines.last() - selectedLines.first() + 1 > distance) continue
                if (isConsecutive(selectedLines)) continue

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

                        val insideSet = candidates.all { candidate ->
                            val primaryCoordinate = if (isColumn) candidate.col else candidate.row
                            val secondaryCoordinate = if (isColumn) candidate.row else candidate.col
                            primaryCoordinate in selectedLines && secondaryCoordinate in secondaryRange
                        }

                        color.takeIf { insideSet }
                    }

                    if (confinedColors.size != lineCount) continue

                    var updatedBoard = boardState
                    val changedCells = mutableListOf<ChangedCell>()
                    for (primary in selectedLines) {
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
                                    "outside confined $axisLabel set ${selectedLines.joinToString(", ")} " +
                                        "within $windowLabel ${secondaryRange.first}-${secondaryRange.last} " +
                                        "reserved for colors ${confinedColors.sorted().joinToString(", ")}",
                                changeType = "SOLVER_CONSTRAINED_${axisLabel.uppercase()}_SET_FLAG",
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
                                    "using constrained $axisLabel set ${selectedLines.joinToString(", ")} " +
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

    private fun isConsecutive(lines: List<Int>): Boolean = lines.zipWithNext().all { (left, right) -> right == left + 1 }

    private fun lineCombinations(size: Int, count: Int): List<List<Int>> {
        val results = mutableListOf<List<Int>>()

        fun build(next: Int, remaining: Int, current: MutableList<Int>) {
            if (remaining == 0) {
                results += current.toList()
                return
            }

            for (value in next..(size - remaining)) {
                current += value
                build(value + 1, remaining - 1, current)
                current.removeAt(current.lastIndex)
            }
        }

        build(next = 0, remaining = count, current = mutableListOf())
        return results
    }
}
