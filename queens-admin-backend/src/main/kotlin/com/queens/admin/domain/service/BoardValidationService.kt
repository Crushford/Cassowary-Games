package com.queens.admin.domain.service

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.model.QueensBoardMetadata
import com.queens.admin.domain.model.QueensRuleset
import com.queens.admin.domain.model.ValidationSummary
import org.springframework.stereotype.Service

@Service
class BoardValidationService(
    private val queensConstraintService: QueensConstraintService,
) {
    fun validate(boardState: BoardState): ValidationSummary =
        validate(boardState, QueensBoardMetadata.ruleset(boardState), QueensBoardMetadata.targetQueenCount(boardState))

    fun validate(
        boardState: BoardState,
        orthogonalMinDistance: Int = boardState.size,
        forbidDiagonalTouch: Boolean = true,
        requireRowCoverage: Boolean = true,
        requireColumnCoverage: Boolean = true,
        targetQueenCount: Int = boardState.size,
    ): ValidationSummary =
        validate(
            boardState = boardState,
            ruleset = QueensRuleset(
                orthogonalMinDistance = orthogonalMinDistance,
                forbidDiagonalTouch = forbidDiagonalTouch,
                requireRowCoverage = requireRowCoverage,
                requireColumnCoverage = requireColumnCoverage,
            ),
            expectedQueenCount = targetQueenCount,
        )

    fun validate(boardState: BoardState, ruleset: QueensRuleset): ValidationSummary =
        validate(boardState, ruleset, QueensBoardMetadata.targetQueenCount(boardState))

    fun validate(
        boardState: BoardState,
        ruleset: QueensRuleset,
        expectedQueenCount: Int,
    ): ValidationSummary {
        val errors = mutableListOf<String>()
        val warnings = mutableListOf<String>()
        val queens = mutableListOf<Triple<Int, Int, String?>>()
        val distinctColors = mutableSetOf<String>()
        var flagCount = 0
        var coloredCellCount = 0

        if (boardState.size < 4 || boardState.size > 20) {
            errors += "Board size must be between 4 and 20."
        }
        if (expectedQueenCount !in 1..(boardState.size * boardState.size)) {
            errors += "Target queen count must be between 1 and ${boardState.size * boardState.size}."
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

        if (queens.size > expectedQueenCount) {
            errors += "Board has ${queens.size} queens, which exceeds the target count ${expectedQueenCount}."
        }
        if (queens.size < expectedQueenCount) {
            warnings += "Board currently has ${queens.size} queens; a full puzzle usually has ${expectedQueenCount}."
        }
        if (coloredCellCount == 0) {
            warnings += "Board has no color groups yet."
        }
        if (distinctColors.isNotEmpty() && distinctColors.size < expectedQueenCount) {
            warnings += "Board currently uses ${distinctColors.size} color groups; authoring usually needs at least ${expectedQueenCount}."
        }

        for (leftIndex in queens.indices) {
            for (rightIndex in leftIndex + 1 until queens.size) {
                val left = queens[leftIndex]
                val right = queens[rightIndex]
                if (
                    queensConstraintService.isConflict(
                        Position(left.first, left.second),
                        Position(right.first, right.second),
                        ruleset,
                    )
                ) {
                    errors += conflictMessage(left, right, ruleset)
                }
                if (left.third != null && left.third == right.third) {
                    errors += "Color group ${left.third} contains multiple queens."
                }
            }
        }

        if (ruleset.requireRowCoverage && queens.size == expectedQueenCount) {
            for (row in 0 until boardState.size) {
                val queensInRow = queens.count { queen -> queen.first == row }
                if (queensInRow != 1) {
                    errors += "Row $row must contain exactly one queen."
                }
            }
        }

        if (ruleset.requireColumnCoverage && queens.size == expectedQueenCount) {
            for (col in 0 until boardState.size) {
                val queensInColumn = queens.count { queen -> queen.second == col }
                if (queensInColumn != 1) {
                    errors += "Column $col must contain exactly one queen."
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

    private fun conflictMessage(
        left: Triple<Int, Int, String?>,
        right: Triple<Int, Int, String?>,
        ruleset: QueensRuleset,
    ): String =
        when {
            left.first == right.first &&
                kotlin.math.abs(left.second - right.second) < ruleset.orthogonalMinDistance ->
                "Queens conflict in row ${left.first}."
            left.second == right.second &&
                kotlin.math.abs(left.first - right.first) < ruleset.orthogonalMinDistance ->
                "Queens conflict in column ${left.second}."
            ruleset.forbidDiagonalTouch &&
                kotlin.math.abs(left.first - right.first) == 1 &&
                kotlin.math.abs(left.second - right.second) == 1 ->
                "Queens conflict diagonally between (${left.first}, ${left.second}) and (${right.first}, ${right.second})."
            else ->
                "Queens conflict between (${left.first}, ${left.second}) and (${right.first}, ${right.second})."
        }
}
