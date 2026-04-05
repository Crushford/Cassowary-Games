package com.queens.admin.application

import com.queens.admin.domain.model.PersistedPuzzle
import com.queens.admin.domain.model.PuzzleDifficultyTier
import com.queens.admin.domain.model.QueensRuleset
import com.queens.admin.domain.service.PersistedPuzzleBoardCodecService
import com.queens.admin.domain.service.QueensConstraintService
import java.time.Instant
import java.util.UUID
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class PuzzleDifficultyAssessmentServiceTest {
    private val persistedPuzzleBoardCodecService = PersistedPuzzleBoardCodecService()
    private val queensConstraintService = QueensConstraintService()
    private val puzzleDifficultyAssessmentService = PuzzleDifficultyAssessmentService(
        persistedPuzzleBoardCodecService = persistedPuzzleBoardCodecService,
        queensConstraintService = queensConstraintService,
    )

    @Test
    fun `assess returns a solved result for a valid classic puzzle fixture`() {
        val result = puzzleDifficultyAssessmentService.assess(
            persistedPuzzle(
                layout = "0111002102223333",
                queens = "..Q.Q......Q.Q..",
            ),
        )

        assertEquals(4, result.finalQueensPlaced)
        assertEquals(0, result.unresolvedSquares)
        assertTrue(result.difficultyTier in PuzzleDifficultyTier.entries)
        assertEquals(result.difficultyTier.score, result.difficultyScore)
    }

    @Test
    fun `assess rejects an unsolvable puzzle fixture`() {
        val error = assertThrows(IllegalArgumentException::class.java) {
            puzzleDifficultyAssessmentService.assess(
                persistedPuzzle(
                    layout = "AAAAAAAAAAAAAAAA",
                    queens = "................",
                ),
            )
        }

        assertTrue(error.message?.contains("could not solve puzzle") == true)
    }

    @Test
    fun `assess rejects a malformed puzzle fixture`() {
        assertThrows(IllegalArgumentException::class.java) {
            puzzleDifficultyAssessmentService.assess(
                persistedPuzzle(
                    layout = "ABC",
                    queens = "...",
                ),
            )
        }
    }

    @Test
    fun `solver version constant stays pinned for regression tracking`() {
        assertEquals("difficulty-v1", PuzzleDifficultyAssessmentService.SOLVER_VERSION)
    }

    @Test
    fun `assess supports a custom orthogonal distance ruleset`() {
        val result = puzzleDifficultyAssessmentService.assess(
            puzzle = persistedPuzzle(
                layout = "0111002102223333",
                queens = "..Q.Q......Q.Q..",
            ),
            ruleset = QueensRuleset(
                orthogonalMinDistance = 2,
                requireRowCoverage = true,
                requireColumnCoverage = true,
            ),
        )

        assertEquals(4, result.finalQueensPlaced)
        assertEquals(0, result.unresolvedSquares)
    }

    private fun persistedPuzzle(
        layout: String,
        queens: String,
    ): PersistedPuzzle =
        PersistedPuzzle(
            id = UUID.fromString("11111111-1111-1111-1111-111111111111"),
            size = kotlin.math.sqrt(layout.length.toDouble()).toInt(),
            layout = layout,
            queens = queens,
            targetQueenCount = kotlin.math.sqrt(layout.length.toDouble()).toInt(),
            orthogonalMinDistance = kotlin.math.sqrt(layout.length.toDouble()).toInt(),
            canonicalSignature = "test-signature",
            minimumGroupSize = 3,
            generationStrategy = "baseline",
            createdAt = Instant.parse("2026-01-01T00:00:00Z"),
        )
}
