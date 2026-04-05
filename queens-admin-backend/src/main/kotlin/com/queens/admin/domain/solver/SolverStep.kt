package com.queens.admin.domain.solver

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.ChangedCell

data class SolverStep(
    val ruleName: String,
    val difficultyTier: SolverDifficultyTier,
    val explanation: String,
    val boardState: BoardState,
    val changedCells: List<ChangedCell>,
)
