package com.queens.admin.domain.service

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.CellState
import com.queens.admin.domain.model.GenerationPhase
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.model.QueensBoardMetadata
import org.springframework.stereotype.Service

@Service
class BoardFactoryService {
    fun createEmptyBoard(
        size: Int,
        metadata: Map<String, String> = emptyMap(),
    ): BoardState {
        return BoardState(
            size = size,
            cells = List(size) { row ->
                List(size) { col ->
                    CellState(
                        position = Position(row, col),
                        groupColor = null,
                        isSolutionQueen = false,
                        markType = MarkType.NONE,
                        isBlackout = false,
                    )
                }
            },
            generationPhase = GenerationPhase.EMPTY,
            metadata = metadata,
        )
    }

    fun clearBoard(boardState: BoardState): BoardState {
        return createEmptyBoard(boardState.size, boardState.metadata)
    }

    fun applyBlackouts(boardState: BoardState, blackoutPositions: Set<Position>): BoardState {
        if (blackoutPositions.isEmpty()) return boardState.copy(containsBlackedOutSquares = false)
        val maskedCells =
            boardState.cells.mapIndexed { rowIndex, row ->
                row.mapIndexed { colIndex, cell ->
                    val isBlackout = Position(rowIndex, colIndex) in blackoutPositions
                    cell.copy(
                        isBlackout = isBlackout,
                        groupColor = if (isBlackout) null else cell.groupColor,
                        isSolutionQueen = if (isBlackout) false else cell.isSolutionQueen,
                        markType = if (isBlackout) MarkType.FLAG else cell.markType,
                    )
                }
            }
        return boardState.copy(
            cells = maskedCells,
            containsBlackedOutSquares = true,
            metadata = boardState.metadata + (QueensBoardMetadata.CONTAINS_BLACKOUT_SQUARES_KEY to "true"),
        )
    }
}
