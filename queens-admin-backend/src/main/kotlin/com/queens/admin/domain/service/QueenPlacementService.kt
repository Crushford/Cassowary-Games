package com.queens.admin.domain.service

import com.queens.admin.domain.model.ActionType
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.ChangedCell
import com.queens.admin.domain.model.GenerationPhase
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.OperationResult
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.model.QueensBoardMetadata
import org.springframework.stereotype.Service
import kotlin.random.Random

@Service
class QueenPlacementService(
    private val boardValidationService: BoardValidationService,
    private val queensConstraintService: QueensConstraintService,
) {
    fun resolveTargetQueenCount(
        size: Int,
        requestedTargetQueenCount: Int,
        queenCountMode: String,
        ruleset: com.queens.admin.domain.model.QueensRuleset,
    ): Int =
        if (queenCountMode.equals("max", ignoreCase = true)) {
            maxQueensForBoard(size, ruleset)
        } else {
            requestedTargetQueenCount
        }

    fun placeQueens(boardState: BoardState): OperationResult {
        val targetQueenCount = QueensBoardMetadata.targetQueenCount(boardState)
        val ruleset = QueensBoardMetadata.ruleset(boardState)
        val positions = placeQueensForBoard(boardState.size, targetQueenCount, ruleset)
            ?: return OperationResult(
                success = false,
                actionType = ActionType.PLACE_QUEENS,
                explanation = "Could not place $targetQueenCount queens on a ${boardState.size}x${boardState.size} board with orthogonal distance ${ruleset.orthogonalMinDistance}.",
                boardState = boardState,
                errors = listOf(
                    "Could not place $targetQueenCount queens on a ${boardState.size}x${boardState.size} board with orthogonal distance ${ruleset.orthogonalMinDistance}.",
                ),
                validation = boardValidationService.validate(boardState),
            )
        val updatedCells = boardState.cells.mapIndexed { rowIndex, row ->
            row.mapIndexed { colIndex, cell ->
                if (Position(rowIndex, colIndex) in positions) {
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
            explanation = "Placed $targetQueenCount queens using the current board ruleset.",
            boardState = updatedBoard.copy(metadata = boardState.metadata),
            changedCells = positions.map { position ->
                ChangedCell(row = position.row, col = position.col, changeType = "QUEEN_PLACED", explanation = "generation seed queen")
            },
            warnings = validation.warnings,
            errors = validation.errors,
            validation = validation,
        )
    }

    private fun placeQueensForBoard(
        size: Int,
        targetQueenCount: Int,
        ruleset: com.queens.admin.domain.model.QueensRuleset,
    ): List<Position>? {
        val allPositions = (0 until size).flatMap { row ->
            (0 until size).map { col -> Position(row, col) }
        }
        val placed = mutableListOf<Position>()
        val random = Random.Default

        fun backtrack(startIndex: Int): Boolean {
            if (placed.size == targetQueenCount) return true
            if (allPositions.size - startIndex < targetQueenCount - placed.size) return false

            val candidates = allPositions.drop(startIndex).shuffled(random)
            for (candidate in candidates) {
                if (!queensConstraintService.isValidPlacement(candidate, placed, ruleset)) continue
                placed += candidate
                if (backtrack(allPositions.indexOf(candidate) + 1)) {
                    return true
                }
                placed.removeLast()
            }
            return false
        }

        return if (backtrack(0)) placed.toList() else null
    }

    private fun maxQueensForBoard(
        size: Int,
        ruleset: com.queens.admin.domain.model.QueensRuleset,
    ): Int {
        val allPositions = (0 until size).flatMap { row ->
            (0 until size).map { col -> Position(row, col) }
        }
        val placed = mutableListOf<Position>()
        var best = 0

        fun backtrack(startIndex: Int) {
            if (placed.size > best) {
                best = placed.size
            }
            if (startIndex >= allPositions.size) {
                return
            }
            if (placed.size + (allPositions.size - startIndex) <= best) {
                return
            }

            for (index in startIndex until allPositions.size) {
                val candidate = allPositions[index]
                if (!queensConstraintService.isValidPlacement(candidate, placed, ruleset)) continue
                placed += candidate
                backtrack(index + 1)
                placed.removeLast()
            }
        }

        backtrack(0)
        return best
    }
}
