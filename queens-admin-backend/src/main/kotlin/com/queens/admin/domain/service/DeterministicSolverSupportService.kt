package com.queens.admin.domain.service

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.CellState
import com.queens.admin.domain.model.ChangedCell
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.model.QueensBoardMetadata
import org.springframework.stereotype.Service

@Service
class DeterministicSolverSupportService(
    private val queensConstraintService: QueensConstraintService,
) {
    fun clearAllMarks(boardState: BoardState): BoardState =
        boardState.copy(
            cells = boardState.cells.map { row ->
                row.map { cell ->
                    cell.copy(markType = if (cell.isBlackout) MarkType.FLAG else MarkType.NONE)
                }
            },
        )

    fun targetQueenCount(boardState: BoardState): Int = QueensBoardMetadata.targetQueenCount(boardState)

    fun ruleset(boardState: BoardState) = QueensBoardMetadata.ruleset(boardState)

    fun countPlacedQueens(boardState: BoardState): Int =
        boardState.cells.sumOf { row -> row.count { cell -> cell.markType == MarkType.QUEEN } }

    fun isSolved(boardState: BoardState): Boolean {
        if (hasContradiction(boardState)) return false
        val groups = groupedPositions(boardState)
        if (groups.size != targetQueenCount(boardState)) return false
        if (countPlacedQueens(boardState) != targetQueenCount(boardState)) return false

        val ruleset = ruleset(boardState)
        if (ruleset.requireRowCoverage) {
            for (row in 0 until boardState.size) {
                val playableCells = (0 until boardState.size).filter { col -> !boardState.cells[row][col].isBlackout }
                if (playableCells.count { col -> boardState.cells[row][col].markType == MarkType.QUEEN } != 1) {
                    return false
                }
            }
        }

        if (ruleset.requireColumnCoverage) {
            for (col in 0 until boardState.size) {
                val playableCells = (0 until boardState.size).filter { row -> !boardState.cells[row][col].isBlackout }
                if (playableCells.count { row -> boardState.cells[row][col].markType == MarkType.QUEEN } != 1) {
                    return false
                }
            }
        }

        return groups.values.all { positions ->
            positions.count { position ->
                boardState.cells[position.row][position.col].markType == MarkType.QUEEN
            } == 1
        }
    }

    fun hasContradiction(boardState: BoardState): Boolean {
        val ruleset = ruleset(boardState)
        val placedQueens = placedQueens(boardState)
        if (placedQueens.size > targetQueenCount(boardState)) return true

        for (leftIndex in placedQueens.indices) {
            for (rightIndex in leftIndex + 1 until placedQueens.size) {
                if (queensConstraintService.isConflict(placedQueens[leftIndex], placedQueens[rightIndex], ruleset)) {
                    return true
                }
            }
        }

        val groups = groupedPositions(boardState)
        if (groups.size != targetQueenCount(boardState)) return true

        if (ruleset.requireRowCoverage) {
            for (row in 0 until boardState.size) {
                if ((0 until boardState.size).none { col -> !boardState.cells[row][col].isBlackout && isCandidateCell(boardState, row, col) }) return true
            }
        }

        if (ruleset.requireColumnCoverage) {
            for (col in 0 until boardState.size) {
                if ((0 until boardState.size).none { row -> !boardState.cells[row][col].isBlackout && isCandidateCell(boardState, row, col) }) return true
            }
        }

        for ((_, positions) in groups) {
            val queensInGroup = positions.count { position ->
                boardState.cells[position.row][position.col].markType == MarkType.QUEEN
            }
            if (queensInGroup > 1) return true
            if (candidatePositions(boardState, positions).isEmpty()) return true
        }

        return false
    }

    fun groupedPositions(boardState: BoardState): Map<String, List<Position>> =
        boardState.cells.flatten()
            .filter { cell -> cell.groupColor != null && !cell.isBlackout }
            .groupBy({ cell -> cell.groupColor!! }, { cell -> cell.position })

    fun candidatePositions(boardState: BoardState, positions: List<Position>): List<Position> =
        positions.filter { position -> isCandidateCell(boardState, position.row, position.col) }

    fun isCandidateCell(boardState: BoardState, row: Int, col: Int): Boolean {
        val cell = boardState.cells[row][col]
        if (cell.groupColor == null || cell.isBlackout) return false
        return when (cell.markType) {
            MarkType.FLAG, MarkType.INVALID -> false
            MarkType.QUEEN -> true
            MarkType.NONE -> {
                val groupHasQueen = groupedPositions(boardState)[cell.groupColor]
                    .orEmpty()
                    .any { position ->
                        boardState.cells[position.row][position.col].markType == MarkType.QUEEN
                    }
                if (groupHasQueen) {
                    false
                } else {
                    queensConstraintService.isValidPlacement(Position(row, col), placedQueens(boardState), ruleset(boardState))
                }
            }
        }
    }

    fun placedQueens(boardState: BoardState): List<Position> =
        boardState.cells.flatten()
            .filter { cell -> cell.markType == MarkType.QUEEN }
            .map(CellState::position)

    fun placeFlag(
        boardState: BoardState,
        row: Int,
        col: Int,
        explanation: String,
        changeType: String = "SOLVER_FLAGGED",
    ): Pair<BoardState, List<ChangedCell>> {
        val existing = boardState.cells[row][col]
        if (existing.markType == MarkType.FLAG) return boardState to emptyList()

        val updatedBoard = boardState.copy(
            cells = boardState.cells.mapIndexed { rowIndex, cells ->
                cells.mapIndexed { colIndex, cell ->
                    if (rowIndex == row && colIndex == col) {
                        cell.copy(markType = MarkType.FLAG)
                    } else {
                        cell
                    }
                }
            },
        )
        return updatedBoard to listOf(
            ChangedCell(row = row, col = col, changeType = changeType, explanation = explanation),
        )
    }

    fun placeQueen(
        boardState: BoardState,
        row: Int,
        col: Int,
        explanation: String,
        queenChangeType: String = "SOLVER_QUEEN_PLACED",
        flagChangeType: String = "SOLVER_FLAGGED",
    ): Pair<BoardState, List<ChangedCell>> {
        val updatedRows = boardState.cells.map { rowCells -> rowCells.toMutableList() }.toMutableList()
        val changes = mutableListOf<ChangedCell>()
        if (updatedRows[row][col].isBlackout) return boardState to emptyList()

        if (updatedRows[row][col].markType != MarkType.QUEEN) {
            updatedRows[row][col] = updatedRows[row][col].copy(markType = MarkType.QUEEN)
            changes += ChangedCell(
                row = row,
                col = col,
                changeType = queenChangeType,
                explanation = explanation,
            )
        }

        val placed = Position(row, col)
        val excluded = queensConstraintService.getExcludedSquares(boardState.size, placed, ruleset(boardState))
        val queenGroupColor = updatedRows[row][col].groupColor

        for (position in excluded) {
            val existing = updatedRows[position.row][position.col]
            if (existing.markType == MarkType.NONE) {
                updatedRows[position.row][position.col] = existing.copy(markType = MarkType.FLAG)
                changes += ChangedCell(
                    row = position.row,
                    col = position.col,
                    changeType = flagChangeType,
                    explanation = "blocked by queen at ($row, $col)",
                )
            }
        }

        if (queenGroupColor != null) {
            for (groupPosition in groupedPositions(boardState)[queenGroupColor].orEmpty()) {
                if (groupPosition == placed) continue
                val existing = updatedRows[groupPosition.row][groupPosition.col]
                if (existing.markType == MarkType.NONE) {
                    updatedRows[groupPosition.row][groupPosition.col] = existing.copy(markType = MarkType.FLAG)
                    changes += ChangedCell(
                        row = groupPosition.row,
                        col = groupPosition.col,
                        changeType = flagChangeType,
                        explanation = "same color group as queen at ($row, $col)",
                    )
                }
            }
        }

        return boardState.copy(cells = updatedRows.map { it.toList() }) to changes
    }
}
