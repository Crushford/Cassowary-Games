package com.queens.admin.domain.service

import com.queens.admin.domain.model.ActionType
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.CellState
import com.queens.admin.domain.model.ChangedCell
import com.queens.admin.domain.model.GenerationPhase
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.OperationResult
import org.springframework.stereotype.Service

@Service
class BoardMutationService(
    private val boardValidationService: BoardValidationService,
) {
    fun setCellColor(boardState: BoardState, row: Int, col: Int, color: String): OperationResult {
        if (color.isBlank()) {
            return failureResult(
                actionType = ActionType.SET_CELL_COLOR,
                explanation = "A non-empty color is required to paint a cell.",
                boardState = boardState,
                error = "Missing color value.",
            )
        }

        val updatedBoard = updateCell(boardState, row, col) { cell -> cell.copy(groupColor = color) }
            ?: return invalidPositionResult(ActionType.SET_CELL_COLOR, boardState, row, col)
        return successResult(
            actionType = ActionType.SET_CELL_COLOR,
            explanation = "Painted cell ($row, $col) $color.",
            boardState = updatedBoard,
            changedCells = listOf(ChangedCell(row, col, "COLOR_SET", "color set to $color")),
        )
    }

    fun clearCellColor(boardState: BoardState, row: Int, col: Int): OperationResult {
        val updatedBoard = updateCell(boardState, row, col) { cell -> cell.copy(groupColor = null) }
            ?: return invalidPositionResult(ActionType.CLEAR_CELL_COLOR, boardState, row, col)
        return successResult(
            actionType = ActionType.CLEAR_CELL_COLOR,
            explanation = "Removed the color group from cell ($row, $col).",
            boardState = updatedBoard,
            changedCells = listOf(ChangedCell(row, col, "COLOR_CLEARED", "color removed")),
        )
    }

    fun placeFlag(boardState: BoardState, row: Int, col: Int): OperationResult {
        val updatedBoard = updateCell(boardState, row, col) { cell ->
            cell.copy(markType = MarkType.FLAG)
        } ?: return invalidPositionResult(ActionType.PLACE_FLAG, boardState, row, col)
        return successResult(
            actionType = ActionType.PLACE_FLAG,
            explanation = "Placed a flag on cell ($row, $col).",
            boardState = updatedBoard,
            changedCells = listOf(ChangedCell(row, col, "FLAG_PLACED", "flag added")),
        )
    }

    fun removeFlag(boardState: BoardState, row: Int, col: Int): OperationResult {
        val updatedBoard = updateCell(boardState, row, col) { cell ->
            if (cell.markType == MarkType.FLAG) cell.copy(markType = MarkType.NONE) else cell
        } ?: return invalidPositionResult(ActionType.REMOVE_FLAG, boardState, row, col)
        return successResult(
            actionType = ActionType.REMOVE_FLAG,
            explanation = "Removed the flag from cell ($row, $col).",
            boardState = updatedBoard,
            changedCells = listOf(ChangedCell(row, col, "FLAG_REMOVED", "flag removed")),
        )
    }

    fun placeQueen(boardState: BoardState, row: Int, col: Int): OperationResult {
        val updatedBoard = updateCell(boardState, row, col) { cell ->
            cell.copy(markType = MarkType.QUEEN, isSolutionQueen = true)
        }?.copy(generationPhase = GenerationPhase.QUEENS_PLACED)
            ?: return invalidPositionResult(ActionType.PLACE_QUEEN, boardState, row, col)
        return successResult(
            actionType = ActionType.PLACE_QUEEN,
            explanation = "Placed a queen on cell ($row, $col).",
            boardState = updatedBoard,
            changedCells = listOf(ChangedCell(row, col, "QUEEN_PLACED", "queen added")),
        )
    }

    fun removeQueen(boardState: BoardState, row: Int, col: Int): OperationResult {
        val updatedBoard = updateCell(boardState, row, col) { cell ->
            if (cell.markType == MarkType.QUEEN) {
                cell.copy(markType = MarkType.NONE, isSolutionQueen = false)
            } else {
                cell
            }
        } ?: return invalidPositionResult(ActionType.REMOVE_QUEEN, boardState, row, col)
        return successResult(
            actionType = ActionType.REMOVE_QUEEN,
            explanation = "Removed the queen from cell ($row, $col).",
            boardState = updatedBoard,
            changedCells = listOf(ChangedCell(row, col, "QUEEN_REMOVED", "queen removed")),
        )
    }

    private fun updateCell(
        boardState: BoardState,
        row: Int,
        col: Int,
        transform: (CellState) -> CellState,
    ): BoardState? {
        if (row !in 0 until boardState.size || col !in 0 until boardState.size) {
            return null
        }

        val updatedRows = boardState.cells.mapIndexed { rowIndex, rowCells ->
            rowCells.mapIndexed { colIndex, cell ->
                if (rowIndex == row && colIndex == col) transform(cell) else cell
            }
        }

        return boardState.copy(cells = updatedRows)
    }

    private fun successResult(
        actionType: ActionType,
        explanation: String,
        boardState: BoardState,
        changedCells: List<ChangedCell>,
    ): OperationResult {
        val validation = boardValidationService.validate(boardState)
        return OperationResult(
            success = true,
            actionType = actionType,
            explanation = explanation,
            boardState = boardState,
            changedCells = changedCells,
            warnings = validation.warnings,
            errors = validation.errors,
            validation = validation,
        )
    }

    private fun invalidPositionResult(
        actionType: ActionType,
        boardState: BoardState,
        row: Int,
        col: Int,
    ): OperationResult {
        return failureResult(
            actionType = actionType,
            explanation = "Target cell ($row, $col) is outside the board.",
            boardState = boardState,
            error = "Target cell ($row, $col) is outside the board.",
        )
    }

    private fun failureResult(
        actionType: ActionType,
        explanation: String,
        boardState: BoardState,
        error: String,
    ): OperationResult {
        val validation = boardValidationService.validate(boardState)
        return OperationResult(
            success = false,
            actionType = actionType,
            explanation = explanation,
            boardState = boardState,
            warnings = validation.warnings,
            errors = validation.errors + error,
            validation = validation,
        )
    }
}
