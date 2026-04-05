package com.queens.admin.domain.service

import com.queens.admin.domain.model.Position
import com.queens.admin.domain.model.QueensRuleset
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class QueensConstraintServiceTest {
    private val queensConstraintService = QueensConstraintService()

    @Test
    fun `same-row queens conflict when their distance is below the configured minimum`() {
        val ruleset = QueensRuleset(orthogonalMinDistance = 3)

        assertTrue(
            queensConstraintService.isConflict(Position(1, 1), Position(1, 3), ruleset),
        )
    }

    @Test
    fun `same-row queens do not conflict when their distance meets the configured minimum`() {
        val ruleset = QueensRuleset(orthogonalMinDistance = 3)

        assertFalse(
            queensConstraintService.isConflict(Position(1, 1), Position(1, 4), ruleset),
        )
    }

    @Test
    fun `same-column queens conflict when their distance is below the configured minimum`() {
        val ruleset = QueensRuleset(orthogonalMinDistance = 4)

        assertTrue(
            queensConstraintService.isConflict(Position(1, 2), Position(3, 2), ruleset),
        )
    }

    @Test
    fun `same-column queens do not conflict when their distance meets the configured minimum`() {
        val ruleset = QueensRuleset(orthogonalMinDistance = 4)

        assertFalse(
            queensConstraintService.isConflict(Position(0, 2), Position(4, 2), ruleset),
        )
    }

    @Test
    fun `diagonal touch still conflicts`() {
        val ruleset = QueensRuleset(orthogonalMinDistance = 2, forbidDiagonalTouch = true)

        assertTrue(
            queensConstraintService.isConflict(Position(2, 2), Position(3, 3), ruleset),
        )
    }

    @Test
    fun `excluded squares reflect the configured orthogonal distance and diagonal touch`() {
        val ruleset = QueensRuleset(orthogonalMinDistance = 3)

        val excluded = queensConstraintService.getExcludedSquares(
            boardSize = 6,
            queenPosition = Position(2, 2),
            ruleset = ruleset,
        )

        assertEquals(
            setOf(
                Position(2, 0),
                Position(2, 1),
                Position(2, 3),
                Position(2, 4),
                Position(0, 2),
                Position(1, 2),
                Position(3, 2),
                Position(4, 2),
                Position(1, 1),
                Position(1, 3),
                Position(3, 1),
                Position(3, 3),
            ),
            excluded,
        )
    }
}
