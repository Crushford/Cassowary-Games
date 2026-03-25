package com.queens.admin.domain.service

import com.queens.admin.domain.solver.SolverRule
import org.springframework.stereotype.Service

@Service
class SolverRuleRegistry(
    private val rules: List<SolverRule>,
) {
    fun orderedRules(): List<SolverRule> = rules.sortedBy { it.ruleName }

    fun findByName(ruleName: String): SolverRule? = orderedRules().firstOrNull { it.ruleName == ruleName }
}
