package com.queens.admin.infrastructure.mapper

import com.queens.admin.api.dto.ChangedCellDto
import com.queens.admin.api.dto.OperationResultDto
import com.queens.admin.api.dto.ValidationSummaryDto
import com.queens.admin.domain.model.OperationResult
import org.springframework.stereotype.Component

@Component
class OperationResultMapper(
    private val boardStateMapper: BoardStateMapper,
) {
    fun toDto(result: OperationResult): OperationResultDto {
        return OperationResultDto(
            success = result.success,
            actionType = result.actionType.name,
            explanation = result.explanation,
            boardState = result.boardState?.let(boardStateMapper::toDto),
            changedCells = result.changedCells.map { changedCell ->
                ChangedCellDto(
                    row = changedCell.row,
                    col = changedCell.col,
                    changeType = changedCell.changeType,
                    explanation = changedCell.explanation,
                )
            },
            warnings = result.warnings,
            errors = result.errors,
            validation = result.validation?.let { validation ->
                ValidationSummaryDto(
                    isValid = validation.isValid,
                    warnings = validation.warnings,
                    errors = validation.errors,
                    queenCount = validation.queenCount,
                    markedFlagCount = validation.markedFlagCount,
                    coloredCellCount = validation.coloredCellCount,
                    distinctColorCount = validation.distinctColorCount,
                )
            },
        )
    }
}
