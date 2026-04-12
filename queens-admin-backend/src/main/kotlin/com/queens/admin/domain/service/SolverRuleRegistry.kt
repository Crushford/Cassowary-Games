package com.queens.admin.domain.service

import com.queens.admin.domain.solver.SolverRule
import com.queens.admin.domain.solver.SolverDifficultyTier
import org.springframework.core.annotation.AnnotationAwareOrderComparator
import org.springframework.stereotype.Service

@Service
class SolverRuleRegistry(
    private val rules: List<SolverRule>,
) {
    fun orderedRules(maxDifficultyTier: SolverDifficultyTier = SolverDifficultyTier.EXTRA_HARD): List<SolverRule> =
        rules
            .filter { rule -> maxDifficultyTier.includes(rule.difficultyTier) }
            .sortedWith(AnnotationAwareOrderComparator.INSTANCE)

    fun findByName(
        ruleName: String,
        maxDifficultyTier: SolverDifficultyTier = SolverDifficultyTier.EXTRA_HARD,
    ): SolverRule? = orderedRules(maxDifficultyTier).firstOrNull { it.ruleName == ruleName }
}
