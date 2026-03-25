package com.queens.admin.domain.solver

import com.queens.admin.domain.model.BoardState

interface SolverRule {
    val ruleName: String

    fun apply(boardState: BoardState): SolverStep?
}
