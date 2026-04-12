package com.queens.admin.application

import com.queens.admin.domain.model.PuzzleDifficultyTier
import com.queens.admin.domain.model.SolverPatternCellRecord
import com.queens.admin.domain.model.SolverPatternOffsetRecord
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class SolverPatternCatalogServiceTest {
    @Test
    fun `normalizeForPersistence trims pattern to the smallest containing square`() {
        val normalized = SolverPatternCatalogService.normalizeForPersistence(
            SolverPatternCatalogService.UpsertSolverPatternRequest(
                id = "solver-pattern-3",
                name = "solver-pattern-3",
                size = 7,
                cells = listOf(
                    SolverPatternCellRecord(row = 2, col = 3, activeSquare = true),
                    SolverPatternCellRecord(row = 3, col = 3, activeSquare = true),
                    SolverPatternCellRecord(row = 4, col = 3, activeSquare = true),
                ),
                outputFlags = listOf(
                    SolverPatternOffsetRecord(row = 3, col = 2),
                    SolverPatternOffsetRecord(row = 3, col = 4),
                ),
                difficultyTier = PuzzleDifficultyTier.MEDIUM,
                enabled = true,
                sortOrder = 120,
            ),
        )

        assertEquals(3, normalized.size)
        assertEquals(
            listOf(
                SolverPatternCellRecord(row = 0, col = 1, activeSquare = true),
                SolverPatternCellRecord(row = 1, col = 1, activeSquare = true),
                SolverPatternCellRecord(row = 2, col = 1, activeSquare = true),
            ),
            normalized.cells,
        )
        assertEquals(
            listOf(
                SolverPatternOffsetRecord(row = 1, col = 0),
                SolverPatternOffsetRecord(row = 1, col = 2),
            ),
            normalized.outputFlags,
        )
    }

    @Test
    fun `normalizeForPersistence accounts for output flags outside the active-cell span`() {
        val normalized = SolverPatternCatalogService.normalizeForPersistence(
            SolverPatternCatalogService.UpsertSolverPatternRequest(
                id = "solver-pattern-wide",
                name = "solver-pattern-wide",
                size = 7,
                cells = listOf(
                    SolverPatternCellRecord(row = 2, col = 3, activeSquare = true),
                    SolverPatternCellRecord(row = 3, col = 3, activeSquare = true),
                    SolverPatternCellRecord(row = 4, col = 3, activeSquare = true),
                ),
                outputFlags = listOf(
                    SolverPatternOffsetRecord(row = 3, col = 1),
                    SolverPatternOffsetRecord(row = 3, col = 5),
                ),
                difficultyTier = PuzzleDifficultyTier.MEDIUM,
                enabled = true,
                sortOrder = 130,
            ),
        )

        assertEquals(5, normalized.size)
        assertEquals(
            listOf(
                SolverPatternCellRecord(row = 0, col = 2, activeSquare = true),
                SolverPatternCellRecord(row = 1, col = 2, activeSquare = true),
                SolverPatternCellRecord(row = 2, col = 2, activeSquare = true),
            ),
            normalized.cells,
        )
        assertEquals(
            listOf(
                SolverPatternOffsetRecord(row = 1, col = 0),
                SolverPatternOffsetRecord(row = 1, col = 4),
            ),
            normalized.outputFlags,
        )
    }
}
