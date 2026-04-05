package com.queens.admin.domain.service

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.CellState
import com.queens.admin.domain.model.GenerationPhase
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.Position
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class BoardValidationServiceTest {
    private val queensConstraintService = QueensConstraintService()
    private val boardValidationService = BoardValidationService(queensConstraintService)

    @Test
    fun `validate accepts a classic board with one queen per row column and color group`() {
        val boardState = buildBoard(
            size = 4,
            layout = "0111002102223333",
            queenPositions = setOf(
                Position(0, 2),
                Position(1, 0),
                Position(2, 3),
                Position(3, 1),
            ),
        )

        val validation = boardValidationService.validate(boardState)

        assertTrue(validation.isValid)
        assertTrue(validation.errors.isEmpty())
        assertTrue(validation.warnings.isEmpty())
    }

    @Test
    fun `validate reports row conflicts`() {
        val boardState = buildBoard(
            size = 4,
            layout = "0111002102223333",
            queenPositions = setOf(
                Position(0, 1),
                Position(0, 3),
            ),
        )

        val validation = boardValidationService.validate(boardState)

        assertFalse(validation.isValid)
        assertTrue(validation.errors.any { it.contains("Queens conflict in row 0.") })
    }

    @Test
    fun `validate reports column conflicts`() {
        val boardState = buildBoard(
            size = 4,
            layout = "0111002102223333",
            queenPositions = setOf(
                Position(0, 2),
                Position(3, 2),
            ),
        )

        val validation = boardValidationService.validate(boardState)

        assertFalse(validation.isValid)
        assertTrue(validation.errors.any { it.contains("Queens conflict in column 2.") })
    }

    @Test
    fun `validate reports diagonal adjacency conflicts`() {
        val boardState = buildBoard(
            size = 4,
            layout = "0111002102223333",
            queenPositions = setOf(
                Position(0, 2),
                Position(1, 1),
            ),
        )

        val validation = boardValidationService.validate(boardState)

        assertFalse(validation.isValid)
        assertTrue(
            validation.errors.any {
                it.contains("Queens conflict diagonally between (0, 2) and (1, 1).")
            },
        )
    }

    @Test
    fun `validate reports multiple queens in the same color group`() {
        val boardState = buildBoard(
            size = 4,
            layout = "0111002102223333",
            queenPositions = setOf(
                Position(0, 1),
                Position(0, 2),
            ),
        )

        val validation = boardValidationService.validate(boardState)

        assertFalse(validation.isValid)
        assertTrue(validation.errors.any { it.contains("Color group 1 contains multiple queens.") })
    }

    @Test
    fun `validate warns when board has fewer queens than board size`() {
        val boardState = buildBoard(
            size = 4,
            layout = "0111002102223333",
            queenPositions = setOf(
                Position(0, 2),
                Position(1, 0),
                Position(2, 3),
            ),
        )

        val validation = boardValidationService.validate(boardState)

        assertTrue(validation.isValid)
        assertTrue(validation.warnings.any { it.contains("Board currently has 3 queens") })
    }

    @Test
    fun `validate fails when board has more queens than board size`() {
        val boardState = buildBoard(
            size = 4,
            layout = "0000111122223333",
            queenPositions = setOf(
                Position(0, 0),
                Position(0, 2),
                Position(1, 1),
                Position(2, 0),
                Position(3, 3),
            ),
        )

        val validation = boardValidationService.validate(boardState)

        assertFalse(validation.isValid)
        assertTrue(validation.errors.any { it.contains("Board has 5 queens, which exceeds the board size 4.") })
    }

    @Test
    fun `validate warns when board has no color groups`() {
        val boardState = buildBoard(
            size = 4,
            layout = "................",
            queenPositions = setOf(
                Position(0, 2),
                Position(1, 0),
                Position(2, 3),
                Position(3, 1),
            ),
        )

        val validation = boardValidationService.validate(boardState)

        assertTrue(validation.isValid)
        assertTrue(validation.warnings.any { it == "Board has no color groups yet." })
    }

    @Test
    fun `validate allows same-row queens when custom orthogonal distance is satisfied`() {
        val boardState = buildBoard(
            size = 5,
            layout = "0011223344001122334400112",
            queenPositions = setOf(
                Position(0, 0),
                Position(0, 3),
            ),
        )

        val validation = boardValidationService.validate(
            boardState = boardState,
            orthogonalMinDistance = 3,
            requireRowCoverage = false,
            requireColumnCoverage = false,
        )

        assertTrue(validation.isValid)
        assertTrue(validation.errors.isEmpty())
    }

    @Test
    fun `validate rejects same-row queens when custom orthogonal distance is violated`() {
        val boardState = buildBoard(
            size = 5,
            layout = "0011223344001122334400112",
            queenPositions = setOf(
                Position(0, 0),
                Position(0, 2),
            ),
        )

        val validation = boardValidationService.validate(
            boardState = boardState,
            orthogonalMinDistance = 3,
            requireRowCoverage = false,
            requireColumnCoverage = false,
        )

        assertFalse(validation.isValid)
        assertTrue(validation.errors.any { it.contains("Queens conflict in row 0.") })
    }

    @Test
    fun `validate fails on malformed dimensions and mismatched cell coordinates`() {
        val validBoard = buildBoard(
            size = 4,
            layout = "0111002102223333",
            queenPositions = setOf(
                Position(0, 2),
                Position(1, 0),
                Position(2, 3),
                Position(3, 1),
            ),
        )
        val malformedBoard = BoardState(
            size = 4,
            cells = validBoard.cells.mapIndexed { rowIndex, row ->
                when (rowIndex) {
                    1 -> row.mapIndexed { colIndex, cell ->
                        if (colIndex == 2) {
                            cell.copy(position = Position(9, 9))
                        } else {
                            cell
                        }
                    }
                    3 -> row.dropLast(1)
                    else -> row
                }
            },
            generationPhase = GenerationPhase.ANALYZED,
        )

        val validation = boardValidationService.validate(malformedBoard)

        assertFalse(validation.isValid)
        assertTrue(validation.errors.any { it.contains("Board row 3 must have 4 cells.") })
        assertTrue(validation.errors.any { it.contains("Cell coordinates must match their position in the board matrix.") })
    }

    private fun buildBoard(
        size: Int,
        layout: String,
        queenPositions: Set<Position>,
    ): BoardState {
        require(layout.length == size * size)
        return BoardState(
            size = size,
            cells = (0 until size).map { row ->
                (0 until size).map { col ->
                    val position = Position(row, col)
                    val layoutChar = layout[row * size + col]
                    val isQueen = position in queenPositions
                    CellState(
                        position = position,
                        groupColor = layoutChar.takeUnless { it == '.' }?.toString(),
                        isSolutionQueen = isQueen,
                        markType = if (isQueen) MarkType.QUEEN else MarkType.NONE,
                    )
                }
            },
            generationPhase = GenerationPhase.ANALYZED,
        )
    }
}
