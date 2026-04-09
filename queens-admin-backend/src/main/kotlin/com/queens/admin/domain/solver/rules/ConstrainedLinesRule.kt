package com.queens.admin.domain.solver.rules

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.ChangedCell
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.solver.SolverDifficultyTier
import com.queens.admin.domain.solver.SolverRule
import com.queens.admin.domain.solver.SolverStep
import com.queens.admin.domain.service.DeterministicSolverSupportService
import org.slf4j.LoggerFactory
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

@Component
@Order(30)
class ConstrainedLinesRule(
    private val solverSupportService: DeterministicSolverSupportService,
) : SolverRule {
    override val ruleName: String = "constrained-lines"
    override val difficultyTier: SolverDifficultyTier = SolverDifficultyTier.MEDIUM

    private val logger = LoggerFactory.getLogger(javaClass)

    override fun apply(boardState: BoardState): SolverStep? {
        eliminateConstrainedLines(boardState, isColumn = false)?.let { return it }
        eliminateConstrainedLines(boardState, isColumn = true)?.let { return it }
        return null
    }

    private fun eliminateConstrainedLines(boardState: BoardState, isColumn: Boolean): SolverStep? {
        val axis = if (isColumn) "column" else "row"
        val size = boardState.size

        val colorToAxisMap = mutableMapOf<String, MutableSet<Int>>()
        for (row in 0 until size) {
            for (col in 0 until size) {
                val cell = boardState.cells[row][col]
                if (cell.markType != MarkType.NONE || cell.groupColor == null) continue

                val coordinate = if (isColumn) col else row
                colorToAxisMap.getOrPut(cell.groupColor) { mutableSetOf() }.add(coordinate)
            }
        }

        if (colorToAxisMap.isEmpty()) {
            logger.info("[ConstrainedLinesRule] No unmarked colored cells remained for axis={}.", axis)
            return null
        }

        val axisSetToColors = mutableMapOf<String, MutableSet<String>>()
        for ((color, axisSet) in colorToAxisMap.entries) {
            val key = axisSet.sorted().joinToString(",")
            axisSetToColors.getOrPut(key) { mutableSetOf() }.add(color)
        }

        logger.info(
            "[ConstrainedLinesRule] axis={} colorToAxisMap={} groupedAxisSets={}",
            axis,
            colorToAxisMap.mapValues { it.value.toSortedSet() },
            axisSetToColors.mapValues { it.value.toSortedSet() },
        )

        for ((axisKey, allowedColors) in axisSetToColors.entries) {
            if (allowedColors.size < 2 || axisKey.isBlank()) continue

            val axisValues = axisKey.split(",").map(String::toInt)
            val candidateFlags = mutableListOf<Pair<Int, Int>>()

            for (primaryIndex in axisValues) {
                for (secondaryIndex in 0 until size) {
                    val row = if (isColumn) secondaryIndex else primaryIndex
                    val col = if (isColumn) primaryIndex else secondaryIndex
                    val cell = boardState.cells[row][col]

                    val isUnmarked = cell.markType == MarkType.NONE
                    val isOutsideAllowedColors = cell.groupColor == null || cell.groupColor !in allowedColors
                    if (isUnmarked && isOutsideAllowedColors) {
                        candidateFlags += row to col
                    }
                }
            }

            if (candidateFlags.isEmpty()) {
                logger.info(
                    "[ConstrainedLinesRule] axis={} axisKey={} allowedColors={} produced no flags.",
                    axis,
                    axisKey,
                    allowedColors.toSortedSet(),
                )
                continue
            }

            var updatedBoard = boardState
            val changedCells = mutableListOf<ChangedCell>()
            for ((row, col) in candidateFlags) {
                val (nextBoard, nextChanges) = solverSupportService.placeFlag(
                    boardState = updatedBoard,
                    row = row,
                    col = col,
                    explanation =
                        "outside allowed colors for constrained $axis group [$axisKey] with colors ${allowedColors.sorted().joinToString(", ")}",
                    changeType = "SOLVER_CONSTRAINED_${axis.uppercase()}_FLAG",
                )
                updatedBoard = nextBoard
                changedCells += nextChanges
            }

            if (changedCells.isNotEmpty()) {
                logger.info(
                    "[ConstrainedLinesRule] axis={} axisKey={} allowedColors={} flagged={}",
                    axis,
                    axisKey,
                    allowedColors.toSortedSet(),
                    candidateFlags,
                )
                return SolverStep(
                    ruleName = ruleName,
                    difficultyTier = difficultyTier,
                    explanation =
                        "Flagged ${changedCells.size} square${if (changedCells.size == 1) "" else "s"} using constrained $axis group [$axisKey] for colors ${allowedColors.sorted().joinToString(", ")}.",
                    boardState = updatedBoard,
                    changedCells = changedCells,
                )
            }
        }

        logger.info("[ConstrainedLinesRule] axis={} found no constrained groups that produced flags.", axis)
        return null
    }
}
