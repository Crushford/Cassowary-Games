package com.queens.admin.domain.solver.rules

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.solver.SolverRule
import com.queens.admin.domain.solver.SolverStep
import org.springframework.stereotype.Component

@Component
class EliminateConstrainedColumnsRule : SolverRule {
    override val ruleName: String = "eliminate-constrained-columns"

    override fun apply(boardState: BoardState): SolverStep? = null
}
