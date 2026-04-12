package com.queens.admin.domain.model

import java.time.Instant

data class PersistedSolverPattern(
    val id: String,
    val name: String,
    val size: Int,
    val cells: List<SolverPatternCellRecord>,
    val outputFlags: List<SolverPatternOffsetRecord>,
    val difficultyTier: PuzzleDifficultyTier,
    val enabled: Boolean,
    val sortOrder: Int,
    val createdAt: Instant,
    val updatedAt: Instant,
)

data class SolverPatternCellRecord(
    val row: Int,
    val col: Int,
    val activeSquare: Boolean = false,
)

data class SolverPatternOffsetRecord(
    val row: Int,
    val col: Int,
)
