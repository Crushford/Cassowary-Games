package com.queens.admin.domain.service

import com.queens.admin.domain.model.ActionType
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.ChangedCell
import com.queens.admin.domain.model.GenerationPhase
import com.queens.admin.domain.model.OperationResult
import org.springframework.stereotype.Service

@Service
class ColorExpansionService(
    private val boardValidationService: BoardValidationService,
) {
    fun expandAllGroupsOnce(boardState: BoardState): OperationResult {
        val mutableRows = boardState.cells.map { row -> row.toMutableList() }.toMutableList()
        val changedCells = mutableListOf<ChangedCell>()

        boardState.cells.forEachIndexed { rowIndex, row ->
            row.forEachIndexed { colIndex, cell ->
                if (cell.groupColor != null) {
                    orthogonalNeighbors(rowIndex, colIndex, boardState.size).firstOrNull { (neighborRow, neighborCol) ->
                        mutableRows[neighborRow][neighborCol].groupColor == null
                    }?.let { (neighborRow, neighborCol) ->
                        mutableRows[neighborRow][neighborCol] = mutableRows[neighborRow][neighborCol].copy(groupColor = cell.groupColor)
                        changedCells += ChangedCell(
                            row = neighborRow,
                            col = neighborCol,
                            changeType = "COLOR_EXPANDED",
                            explanation = "expanded ${cell.groupColor} by one step",
                        )
                    }
                }
            }
        }

        val updatedBoard = boardState.copy(
            cells = mutableRows.map { it.toList() },
            generationPhase = GenerationPhase.GROUPS_EXPANDED,
        )
        val validation = boardValidationService.validate(updatedBoard)

        return OperationResult(
            success = true,
            actionType = ActionType.EXPAND_ALL_GROUPS_ONCE,
            explanation = "Expanded each visible color group by at most one square.",
            boardState = updatedBoard,
            changedCells = changedCells,
            warnings = validation.warnings,
            errors = validation.errors,
            validation = validation,
        )
    }

    fun expandSelectedGroup(boardState: BoardState, targetColor: String?): OperationResult {
        if (targetColor.isNullOrBlank()) {
            return OperationResult(
                success = false,
                actionType = ActionType.EXPAND_SELECTED_GROUP,
                explanation = "A target color is required to expand a selected group.",
                boardState = boardState,
                errors = listOf("Missing target color."),
                validation = boardValidationService.validate(boardState),
            )
        }

        val mutableRows = boardState.cells.map { row -> row.toMutableList() }.toMutableList()
        val changedCells = mutableListOf<ChangedCell>()

        loop@ for (rowIndex in boardState.cells.indices) {
            for (colIndex in boardState.cells[rowIndex].indices) {
                val cell = boardState.cells[rowIndex][colIndex]
                if (cell.groupColor == targetColor) {
                    val targetNeighbor = orthogonalNeighbors(rowIndex, colIndex, boardState.size)
                        .firstOrNull { (neighborRow, neighborCol) ->
                            mutableRows[neighborRow][neighborCol].groupColor == null
                        }
                    if (targetNeighbor != null) {
                        val (neighborRow, neighborCol) = targetNeighbor
                        mutableRows[neighborRow][neighborCol] = mutableRows[neighborRow][neighborCol].copy(groupColor = targetColor)
                        changedCells += ChangedCell(neighborRow, neighborCol, "COLOR_EXPANDED", "expanded $targetColor")
                        break@loop
                    }
                }
            }
        }

        val updatedBoard = boardState.copy(
            cells = mutableRows.map { it.toList() },
            generationPhase = GenerationPhase.GROUPS_EXPANDED,
        )
        val validation = boardValidationService.validate(updatedBoard)

        return OperationResult(
            success = true,
            actionType = ActionType.EXPAND_SELECTED_GROUP,
            explanation = "Expanded the selected color group once.",
            boardState = updatedBoard,
            changedCells = changedCells,
            warnings = validation.warnings,
            errors = validation.errors,
            validation = validation,
        )
    }

    private fun orthogonalNeighbors(row: Int, col: Int, size: Int): List<Pair<Int, Int>> {
        return listOf(
            row - 1 to col,
            row + 1 to col,
            row to col - 1,
            row to col + 1,
        ).filter { (candidateRow, candidateCol) ->
            candidateRow in 0 until size && candidateCol in 0 until size
        }
    }
}
