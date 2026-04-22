package com.queens.admin.infrastructure.mapper

import com.queens.admin.api.dto.BoardStateDto
import com.queens.admin.api.dto.CellDto
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.CellState
import com.queens.admin.domain.model.GenerationPhase
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.Position
import org.springframework.stereotype.Component

@Component
class BoardStateMapper {
    fun toDomain(dto: BoardStateDto): BoardState {
        return BoardState(
            size = dto.size,
            cells = dto.cells.mapIndexed { rowIndex, row ->
                row.mapIndexed { colIndex, cell ->
                    CellState(
                        position = Position(
                            row = cell.row.takeIf { it == rowIndex } ?: rowIndex,
                            col = cell.col.takeIf { it == colIndex } ?: colIndex,
                        ),
                        groupColor = cell.groupColor,
                        isSolutionQueen = cell.isSolutionQueen,
                        markType = parseMarkType(cell.markType),
                        isBlackout = cell.isBlackout,
                    )
                }
            },
            generationPhase = parseGenerationPhase(dto.generationPhase),
            metadata = dto.metadata,
        )
    }

    fun toDto(domain: BoardState): BoardStateDto {
        return BoardStateDto(
            size = domain.size,
            cells = domain.cells.map { row ->
                row.map { cell ->
                    CellDto(
                        row = cell.position.row,
                        col = cell.position.col,
                        groupColor = cell.groupColor,
                        isSolutionQueen = cell.isSolutionQueen,
                        markType = cell.markType.name,
                        isBlackout = cell.isBlackout,
                    )
                }
            },
            generationPhase = domain.generationPhase.name,
            metadata = domain.metadata,
        )
    }

    private fun parseMarkType(value: String?): MarkType {
        return value?.let {
            MarkType.entries.firstOrNull { candidate -> candidate.name == value }
        } ?: MarkType.NONE
    }

    private fun parseGenerationPhase(value: String?): GenerationPhase {
        return value?.let {
            GenerationPhase.entries.firstOrNull { candidate -> candidate.name == value }
        } ?: GenerationPhase.EMPTY
    }
}
