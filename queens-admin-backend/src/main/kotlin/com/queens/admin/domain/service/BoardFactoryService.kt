package com.queens.admin.domain.service

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.CellState
import com.queens.admin.domain.model.GenerationPhase
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.Position
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
}
