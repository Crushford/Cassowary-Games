package com.queens.admin.domain.service

import com.queens.admin.domain.model.ActionType
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.ChangedCell
import com.queens.admin.domain.model.GenerationPhase
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.OperationResult
import org.springframework.stereotype.Service

@Service
class InitialColorAssignmentService(
    private val boardValidationService: BoardValidationService,
) {
    fun assignInitialColors(boardState: BoardState): OperationResult {
        var queenIndex = 0
        val changedCells = mutableListOf<ChangedCell>()
        val updatedCells = boardState.cells.mapIndexed { rowIndex, row ->
            row.mapIndexed { colIndex, cell ->
                if (cell.markType == MarkType.QUEEN) {
                    val color = "g${(queenIndex + 1).toString().padStart(2, '0')}"
                    queenIndex += 1
                    changedCells += ChangedCell(rowIndex, colIndex, "COLOR_SET", "seed region $color")
                    cell.copy(groupColor = color)
                } else {
                    cell
                }
            }
        }
        val updatedBoard = boardState.copy(
            cells = updatedCells,
            generationPhase = GenerationPhase.INITIAL_COLORS_ASSIGNED,
        )
        val validation = boardValidationService.validate(updatedBoard)

        return OperationResult(
            success = true,
            actionType = ActionType.ASSIGN_INITIAL_COLORS,
            explanation = "Assigned one seed region id to each queen cell.",
            boardState = updatedBoard,
            changedCells = changedCells,
            warnings = validation.warnings,
            errors = validation.errors,
            validation = validation,
        )
    }
}
