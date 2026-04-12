package com.queens.admin.domain.solver.rules

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.CellState
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.model.QueensBoardMetadata
import com.queens.admin.domain.service.DeterministicSolverSupportService
import com.queens.admin.domain.service.QueensConstraintService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class ConstrainedLinesRuleTest {
    private val support = DeterministicSolverSupportService(QueensConstraintService())
    private val rule = ConstrainedLinesRule(support)

    @Test
    fun `flags only inside constrained row windows sized by queen distance`() {
        val step = rule.apply(
            board(
                size = 7,
                orthogonalMinDistance = 5,
                groups = mapOf(
                    Position(0, 0) to "A",
                    Position(1, 1) to "A",
                    Position(0, 3) to "B",
                    Position(1, 4) to "B",
                    Position(0, 2) to "C",
                    Position(0, 6) to "C",
                ),
            ),
        )

        assertNotNull(step)
        step!!
        assertEquals(listOf(Position(0, 2)), step.changedCells.map { Position(it.row, it.col) })
        assertEquals(MarkType.FLAG, step.boardState.cells[0][2].markType)
        assertEquals(MarkType.NONE, step.boardState.cells[0][6].markType)
    }

    @Test
    fun `flags only inside constrained column windows sized by queen distance`() {
        val step = rule.apply(
            board(
                size = 7,
                orthogonalMinDistance = 5,
                groups = mapOf(
                    Position(0, 0) to "A",
                    Position(1, 1) to "A",
                    Position(3, 0) to "B",
                    Position(4, 1) to "B",
                    Position(2, 0) to "C",
                    Position(6, 0) to "C",
                ),
            ),
        )

        assertNotNull(step)
        step!!
        assertEquals(listOf(Position(2, 0)), step.changedCells.map { Position(it.row, it.col) })
        assertEquals(MarkType.FLAG, step.boardState.cells[2][0].markType)
        assertEquals(MarkType.NONE, step.boardState.cells[6][0].markType)
    }

    @Test
    fun `does nothing when colors are not confined inside a sliding band`() {
        val step = rule.apply(
            board(
                size = 7,
                orthogonalMinDistance = 5,
                groups = mapOf(
                    Position(0, 0) to "A",
                    Position(1, 5) to "A",
                    Position(0, 1) to "B",
                    Position(1, 6) to "B",
                    Position(0, 2) to "C",
                ),
            ),
        )

        assertNull(step)
    }

    @Test
    fun `flags remaining candidates in a single confined column when min distance spans the full board`() {
        val step = rule.apply(
            board(
                size = 7,
                orthogonalMinDistance = 7,
                groups = mapOf(
                    Position(1, 6) to "A",
                    Position(2, 6) to "A",
                    Position(5, 6) to "B",
                    Position(6, 5) to "B",
                ),
                marks = mapOf(
                    Position(0, 6) to MarkType.FLAG,
                    Position(3, 6) to MarkType.FLAG,
                    Position(4, 6) to MarkType.FLAG,
                ),
            ),
        )

        assertNotNull(step)
        step!!
        assertEquals(listOf(Position(5, 6)), step.changedCells.map { Position(it.row, it.col) })
        assertEquals(MarkType.FLAG, step.boardState.cells[5][6].markType)
        assertEquals(MarkType.NONE, step.boardState.cells[6][5].markType)
    }

    private fun board(
        size: Int,
        orthogonalMinDistance: Int,
        groups: Map<Position, String>,
        marks: Map<Position, MarkType> = emptyMap(),
    ): BoardState =
        BoardState(
            size = size,
            metadata = QueensBoardMetadata.metadata(
                boardSize = size,
                orthogonalMinDistance = orthogonalMinDistance,
            ),
            cells = List(size) { row ->
                List(size) { col ->
                    val position = Position(row, col)
                    CellState(
                        position = position,
                        groupColor = groups[position],
                        markType = marks[position] ?: MarkType.NONE,
                    )
                }
            },
        )
}
