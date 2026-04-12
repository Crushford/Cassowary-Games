package com.queens.admin.domain.solver

import com.queens.admin.domain.model.BoardState

data class SolverResult(
    val boardState: BoardState,
    val steps: List<SolverStep>,
    val progressMade: Boolean,
    val solved: Boolean,
    val stuck: Boolean,
    val maxDifficultyTier: SolverDifficultyTier = SolverDifficultyTier.EXTRA_HARD,
)
