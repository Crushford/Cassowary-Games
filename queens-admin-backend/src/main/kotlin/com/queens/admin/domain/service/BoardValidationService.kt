package com.queens.admin.domain.service

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.ValidationSummary
import org.springframework.stereotype.Service
import kotlin.math.abs

@Service
class BoardValidationService {
    fun validate(boardState: BoardState): ValidationSummary {
        val errors = mutableListOf<String>()
        val warnings = mutableListOf<String>()
        val queens = mutableListOf<Triple<Int, Int, String?>>()
        val distinctColors = mutableSetOf<String>()
        var flagCount = 0
        var coloredCellCount = 0

        if (boardState.size < 4 || boardState.size > 12) {
            errors += "Board size must be between 4 and 12."
        }
        if (boardState.cells.size != boardState.size) {
            errors += "Board must have ${boardState.size} rows."
        }

        boardState.cells.forEachIndexed { rowIndex, row ->
            if (row.size != boardState.size) {
                errors += "Board row $rowIndex must have ${boardState.size} cells."
            }

            row.forEachIndexed { colIndex, cell ->
                if (cell.position.row != rowIndex || cell.position.col != colIndex) {
                    errors += "Cell coordinates must match their position in the board matrix."
                }
                if (cell.groupColor != null) {
                    coloredCellCount += 1
                    distinctColors += cell.groupColor
                }
                when (cell.markType) {
                    MarkType.FLAG -> flagCount += 1
                    else -> Unit
                }
                if (cell.isSolutionQueen || cell.markType == MarkType.QUEEN) {
                    queens += Triple(rowIndex, colIndex, cell.groupColor)
                }
            }
        }

        if (queens.size > boardState.size) {
            errors += "Board has ${queens.size} queens, which exceeds the board size ${boardState.size}."
        }
        if (queens.size < boardState.size) {
            warnings += "Board currently has ${queens.size} queens; a full puzzle usually has ${boardState.size}."
        }
        if (coloredCellCount == 0) {
            warnings += "Board has no color groups yet."
        }
        if (distinctColors.isNotEmpty() && distinctColors.size < boardState.size) {
            warnings += "Board currently uses ${distinctColors.size} color groups; authoring usually needs at least ${boardState.size}."
        }

        for (leftIndex in queens.indices) {
            for (rightIndex in leftIndex + 1 until queens.size) {
                val left = queens[leftIndex]
                val right = queens[rightIndex]
                if (left.first == right.first) {
                    errors += "Queens conflict in row ${left.first}."
                }
                if (left.second == right.second) {
                    errors += "Queens conflict in column ${left.second}."
                }
                if (abs(left.first - right.first) == 1 && abs(left.second - right.second) == 1) {
                    errors += "Queens conflict diagonally between (${left.first}, ${left.second}) and (${right.first}, ${right.second})."
                }
                if (left.third != null && left.third == right.third) {
                    errors += "Color group ${left.third} contains multiple queens."
                }
            }
        }

        return ValidationSummary(
            isValid = errors.isEmpty(),
            warnings = warnings.distinct(),
            errors = errors.distinct(),
            queenCount = queens.size,
            markedFlagCount = flagCount,
            coloredCellCount = coloredCellCount,
            distinctColorCount = distinctColors.size,
        )
    }
}
