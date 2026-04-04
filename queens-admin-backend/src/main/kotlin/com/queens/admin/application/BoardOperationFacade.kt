package com.queens.admin.application

import com.queens.admin.domain.model.ActionType
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.OperationResult
import com.queens.admin.domain.service.BoardFactoryService
import com.queens.admin.domain.service.BoardMutationService
import com.queens.admin.domain.service.BoardValidationService
import org.springframework.stereotype.Service

@Service
class BoardOperationFacade(
    private val boardFactoryService: BoardFactoryService,
    private val boardValidationService: BoardValidationService,
    private val boardMutationService: BoardMutationService,
) {
    fun createBoard(size: Int): OperationResult {
        if (size !in 4..20) {
            return OperationResult(
                success = false,
                actionType = ActionType.CREATE_BOARD,
                explanation = "Board size must be between 4 and 20.",
                boardState = null,
                errors = listOf("Board size must be between 4 and 20."),
            )
        }

        val boardState = boardFactoryService.createEmptyBoard(size)
        val validation = boardValidationService.validate(boardState)

        return OperationResult(
            success = true,
            actionType = ActionType.CREATE_BOARD,
            explanation = "Created a new empty workshop board.",
            boardState = boardState,
            changedCells = emptyList(),
            warnings = validation.warnings,
            errors = validation.errors,
            validation = validation,
        )
    }

    fun clearBoard(boardState: BoardState): OperationResult {
        val clearedBoard = boardFactoryService.clearBoard(boardState)
        val validation = boardValidationService.validate(clearedBoard)

        return OperationResult(
            success = true,
            actionType = ActionType.CLEAR_BOARD,
            explanation = "Cleared colors, flags, and queens from the current board.",
            boardState = clearedBoard,
            changedCells = clearedBoard.cells.flatMap { row ->
                row.map { cell ->
                    com.queens.admin.domain.model.ChangedCell(
                        row = cell.position.row,
                        col = cell.position.col,
                        changeType = "BOARD_CLEARED",
                        explanation = "reset to empty state",
                    )
                }
            },
            warnings = validation.warnings,
            errors = validation.errors,
            validation = validation,
        )
    }

    fun validateBoard(boardState: BoardState): OperationResult {
        val validation = boardValidationService.validate(boardState)

        return OperationResult(
            success = validation.isValid,
            actionType = ActionType.VALIDATE_BOARD,
            explanation = if (validation.isValid) {
                "Board validation passed."
            } else {
                "Board validation found rule conflicts or incomplete authoring state."
            },
            boardState = boardState,
            warnings = validation.warnings,
            errors = validation.errors,
            validation = validation,
        )
    }

    fun setCellColor(boardState: BoardState, row: Int, col: Int, color: String): OperationResult =
        boardMutationService.setCellColor(boardState, row, col, color)

    fun clearCellColor(boardState: BoardState, row: Int, col: Int): OperationResult =
        boardMutationService.clearCellColor(boardState, row, col)

    fun placeFlag(boardState: BoardState, row: Int, col: Int): OperationResult =
        boardMutationService.placeFlag(boardState, row, col)

    fun removeFlag(boardState: BoardState, row: Int, col: Int): OperationResult =
        boardMutationService.removeFlag(boardState, row, col)

    fun placeQueen(boardState: BoardState, row: Int, col: Int): OperationResult =
        boardMutationService.placeQueen(boardState, row, col)

    fun removeQueen(boardState: BoardState, row: Int, col: Int): OperationResult =
        boardMutationService.removeQueen(boardState, row, col)
}
