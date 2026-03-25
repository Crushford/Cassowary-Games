package com.queens.admin.domain.service

import com.queens.admin.domain.model.ActionType
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.ChangedCell
import com.queens.admin.domain.model.GenerationPhase
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.OperationResult
import org.springframework.stereotype.Service

@Service
class QueenPlacementService(
    private val boardValidationService: BoardValidationService,
) {
    fun placeQueens(boardState: BoardState): OperationResult {
        val positions = cyclicPermutation(boardState.size)
        val updatedCells = boardState.cells.mapIndexed { rowIndex, row ->
            row.mapIndexed { colIndex, cell ->
                if (positions[rowIndex] == colIndex) {
                    cell.copy(markType = MarkType.QUEEN, isSolutionQueen = true)
                } else {
                    cell
                }
            }
        }
        val updatedBoard = boardState.copy(
            cells = updatedCells,
            generationPhase = GenerationPhase.QUEENS_PLACED,
        )
        val validation = boardValidationService.validate(updatedBoard)

        return OperationResult(
            success = true,
            actionType = ActionType.PLACE_QUEENS,
            explanation = "Placed one queen in each row using the current generation seed pattern.",
            boardState = updatedBoard,
            changedCells = positions.mapIndexed { row, col ->
                ChangedCell(row = row, col = col, changeType = "QUEEN_PLACED", explanation = "generation seed queen")
            },
            warnings = validation.warnings,
            errors = validation.errors,
            validation = validation,
        )
    }

    private fun cyclicPermutation(size: Int): List<Int> {
        val usedColumns = mutableSetOf<Int>()
        val positions = mutableListOf<Int>()

        for (row in 0 until size) {
            val previousColumn = positions.lastOrNull()
            val nextColumn = (0 until size).firstOrNull { candidateColumn ->
                candidateColumn !in usedColumns && (previousColumn == null || kotlin.math.abs(previousColumn - candidateColumn) != 1)
            } ?: (0 until size).first { candidateColumn -> candidateColumn !in usedColumns }

            positions += nextColumn
            usedColumns += nextColumn
        }

        return positions
    }
}
