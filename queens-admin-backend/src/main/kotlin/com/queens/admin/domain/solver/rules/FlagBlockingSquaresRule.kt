package com.queens.admin.domain.solver.rules

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.solver.SolverRule
import com.queens.admin.domain.solver.SolverStep
import org.springframework.stereotype.Component

@Component
class FlagBlockingSquaresRule : SolverRule {
    override val ruleName: String = "flag-blocking-squares"

    override fun apply(boardState: BoardState): SolverStep? = null
}
