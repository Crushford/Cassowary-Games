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
import org.junit.jupiter.api.Test

class ConstrainedLineSetsRuleTest {
    private val support = DeterministicSolverSupportService(QueensConstraintService())
    private val rule = ConstrainedLineSetsRule(support)

    @Test
    fun `flags candidates in non-adjacent constrained column sets`() {
        val step = rule.apply(
            board(
                size = 6,
                orthogonalMinDistance = 6,
                groups = mapOf(
                    Position(0, 1) to "A",
                    Position(1, 1) to "A",
                    Position(3, 4) to "B",
                    Position(4, 4) to "B",
                    Position(2, 1) to "C",
                    Position(5, 0) to "C",
                ),
            ),
        )

        assertNotNull(step)
        step!!
        assertEquals(listOf(Position(2, 1)), step.changedCells.map { Position(it.row, it.col) })
        assertEquals(MarkType.FLAG, step.boardState.cells[2][1].markType)
        assertEquals(MarkType.NONE, step.boardState.cells[5][0].markType)
    }

    @Test
    fun `flags candidates in non-adjacent constrained row sets`() {
        val step = rule.apply(
            board(
                size = 6,
                orthogonalMinDistance = 6,
                groups = mapOf(
                    Position(1, 0) to "A",
                    Position(1, 1) to "A",
                    Position(4, 3) to "B",
                    Position(4, 4) to "B",
                    Position(1, 5) to "C",
                    Position(0, 2) to "C",
                ),
            ),
        )

        assertNotNull(step)
        step!!
        assertEquals(listOf(Position(1, 5)), step.changedCells.map { Position(it.row, it.col) })
        assertEquals(MarkType.FLAG, step.boardState.cells[1][5].markType)
        assertEquals(MarkType.NONE, step.boardState.cells[0][2].markType)
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
