package com.queens.admin.application

import com.queens.admin.domain.model.ActionType
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.OperationResult
import com.queens.admin.domain.model.QueensBoardMetadata
import com.queens.admin.domain.service.BoardFactoryService
import com.queens.admin.domain.service.BoardMutationService
import com.queens.admin.domain.service.BoardValidationService
import com.queens.admin.domain.service.QueenPlacementService
import org.springframework.stereotype.Service

@Service
class BoardOperationFacade(
    private val boardFactoryService: BoardFactoryService,
    private val boardValidationService: BoardValidationService,
    private val boardMutationService: BoardMutationService,
    private val queenPlacementService: QueenPlacementService,
) {
    fun createBoard(
        size: Int,
        queenCountMode: String = "exact",
        targetQueenCount: Int = size,
        orthogonalMinDistance: Int = size,
    ): OperationResult {
        if (size !in 4..20) {
            return OperationResult(
                success = false,
                actionType = ActionType.CREATE_BOARD,
                explanation = "Board size must be between 4 and 20.",
                boardState = null,
                errors = listOf("Board size must be between 4 and 20."),
            )
        }
        if (targetQueenCount !in 1..(size * size)) {
            return OperationResult(
                success = false,
                actionType = ActionType.CREATE_BOARD,
                explanation = "Target queen count must be between 1 and ${size * size}.",
                boardState = null,
                errors = listOf("Target queen count must be between 1 and ${size * size}."),
            )
        }
        if (orthogonalMinDistance < 1) {
            return OperationResult(
                success = false,
                actionType = ActionType.CREATE_BOARD,
                explanation = "Orthogonal minimum distance must be at least 1.",
                boardState = null,
                errors = listOf("Orthogonal minimum distance must be at least 1."),
            )
        }
        if (
            queenCountMode.equals("max", ignoreCase = true) &&
            !queenPlacementService.hasPrecomputedMaxQueenCount(size, orthogonalMinDistance)
        ) {
            val supportedDistances = queenPlacementService.supportedPrecomputedDistances(size)
            val error =
                if (supportedDistances.isEmpty()) {
                    "Max queen mode is not available yet for ${size}x$size boards."
                } else {
                    "Max queen mode is only available for ${size}x$size with orthogonal distances ${supportedDistances.joinToString(", ")}."
                }
            return OperationResult(
                success = false,
                actionType = ActionType.CREATE_BOARD,
                explanation = error,
                boardState = null,
                errors = listOf(error),
            )
        }

        val resolvedTargetQueenCount = queenPlacementService.resolveTargetQueenCount(
            size = size,
            requestedTargetQueenCount = targetQueenCount,
            queenCountMode = queenCountMode,
            ruleset = QueensBoardMetadata.ruleset(
                boardFactoryService.createEmptyBoard(
                    size = size,
                    metadata = QueensBoardMetadata.metadata(
                        boardSize = size,
                        targetQueenCount = targetQueenCount,
                        orthogonalMinDistance = orthogonalMinDistance,
                    ),
                ),
            ),
        )

        val boardState = boardFactoryService.createEmptyBoard(
            size = size,
            metadata = QueensBoardMetadata.metadata(
                boardSize = size,
                targetQueenCount = resolvedTargetQueenCount,
                orthogonalMinDistance = orthogonalMinDistance,
            ),
        )
        val validation = boardValidationService.validate(boardState)

        return OperationResult(
            success = true,
            actionType = ActionType.CREATE_BOARD,
            explanation = if (queenCountMode.equals("max", ignoreCase = true)) {
                "Created a new empty workshop board with the maximum legal queen count resolved to $resolvedTargetQueenCount."
            } else {
                "Created a new empty workshop board."
            },
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
