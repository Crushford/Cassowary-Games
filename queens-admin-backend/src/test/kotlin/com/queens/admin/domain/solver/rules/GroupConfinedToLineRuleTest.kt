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
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class GroupConfinedToLineRuleTest {
    private val support = DeterministicSolverSupportService(QueensConstraintService())
    private val rule = GroupConfinedToLineRule(support)

    @Test
    fun `flags only the guaranteed exclusion band when a group is confined to one row`() {
        val step = rule.apply(
            board(
                size = 6,
                orthogonalMinDistance = 5,
                groups = mapOf(
                    Position(2, 2) to "A",
                    Position(2, 3) to "A",
                    Position(2, 4) to "A",
                    Position(2, 0) to "B",
                    Position(2, 1) to "C",
                    Position(2, 5) to "D",
                ),
            ),
        )

        assertNotNull(step)
        step!!
        assertEquals("group-confined-to-line", step.ruleName)
        assertEquals(
            listOf(Position(2, 0), Position(2, 1), Position(2, 5)),
            step.changedCells.map { Position(it.row, it.col) }
        )
        assertEquals(MarkType.FLAG, step.boardState.cells[2][0].markType)
        assertEquals(MarkType.FLAG, step.boardState.cells[2][1].markType)
        assertEquals(MarkType.FLAG, step.boardState.cells[2][5].markType)
        assertEquals(MarkType.NONE, step.boardState.cells[2][2].markType)
        assertEquals(MarkType.NONE, step.boardState.cells[2][3].markType)
        assertEquals(MarkType.NONE, step.boardState.cells[2][4].markType)
        assertTrue(step.explanation.contains("1 color group"))
    }

    @Test
    fun `flags only the guaranteed exclusion band when a group is confined to one column`() {
        val step = rule.apply(
            board(
                size = 6,
                orthogonalMinDistance = 5,
                groups = mapOf(
                    Position(2, 3) to "A",
                    Position(3, 3) to "A",
                    Position(4, 3) to "A",
                    Position(0, 3) to "B",
                    Position(1, 3) to "C",
                    Position(5, 3) to "D",
                ),
            ),
        )

        assertNotNull(step)
        step!!
        assertEquals(
            listOf(Position(0, 3), Position(1, 3), Position(5, 3)),
            step.changedCells.map { Position(it.row, it.col) }
        )
        assertEquals(MarkType.FLAG, step.boardState.cells[0][3].markType)
        assertEquals(MarkType.FLAG, step.boardState.cells[1][3].markType)
        assertEquals(MarkType.FLAG, step.boardState.cells[5][3].markType)
        assertEquals(MarkType.NONE, step.boardState.cells[2][3].markType)
        assertEquals(MarkType.NONE, step.boardState.cells[3][3].markType)
        assertEquals(MarkType.NONE, step.boardState.cells[4][3].markType)
    }

    @Test
    fun `does not run for solved groups or single-candidate groups`() {
        val step = rule.apply(
            board(
                size = 4,
                groups = mapOf(
                    Position(0, 0) to "A",
                    Position(0, 1) to "A",
                    Position(1, 0) to "B",
                    Position(1, 1) to "B",
                    Position(2, 2) to "C",
                    Position(3, 3) to "C",
                ),
                marks = mapOf(
                    Position(0, 0) to MarkType.QUEEN,
                    Position(3, 3) to MarkType.FLAG,
                ),
            ),
        )

        assertNull(step)
    }

    private fun board(
        size: Int,
        orthogonalMinDistance: Int = size,
        groups: Map<Position, String>,
        marks: Map<Position, MarkType> = emptyMap(),
    ): BoardState =
        BoardState(
            size = size,
            metadata = QueensBoardMetadata.metadata(
                boardSize = size,
                orthogonalMinDistance = orthogonalMinDistance
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
