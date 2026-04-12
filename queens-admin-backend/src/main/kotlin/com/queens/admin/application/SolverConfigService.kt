package com.queens.admin.application

import com.queens.admin.domain.model.PersistedSolverPattern
import com.queens.admin.domain.model.PuzzleDifficultyTier
import org.springframework.stereotype.Service

@Service
class SolverConfigService(
    private val solverPatternCatalogService: SolverPatternCatalogService,
) {
    data class BuiltInSolverStepDefinition(
        val id: String,
        val label: String,
        val description: String,
        val difficultyTier: PuzzleDifficultyTier,
        val enabled: Boolean,
        val sortOrder: Int,
    )

    data class SolverConfig(
        val builtInSteps: List<BuiltInSolverStepDefinition>,
        val patterns: List<PersistedSolverPattern>,
    )

    companion object {
        fun defaultBuiltInSolverSteps(): List<BuiltInSolverStepDefinition> =
            listOf(
                BuiltInSolverStepDefinition(
                    id = "single-color",
                    label = "Single Color Queen",
                    description = "Place the queen when exactly one valid square remains in a color group.",
                    difficultyTier = PuzzleDifficultyTier.EXTRA_EASY,
                    enabled = true,
                    sortOrder = 10,
                ),
                BuiltInSolverStepDefinition(
                    id = "row-column",
                    label = "Row / Column Constraints",
                    description = "Use constrained sliding row and column bands to eliminate impossible candidates.",
                    difficultyTier = PuzzleDifficultyTier.HARD,
                    enabled = true,
                    sortOrder = 20,
                ),
                BuiltInSolverStepDefinition(
                    id = "row-column-sets",
                    label = "Row / Column Set Constraints",
                    description = "Use row and column sets inside a queen-distance window to eliminate impossible candidates, including non-adjacent lines.",
                    difficultyTier = PuzzleDifficultyTier.EXTRA_HARD,
                    enabled = true,
                    sortOrder = 25,
                ),
                BuiltInSolverStepDefinition(
                    id = "group-confined-to-line",
                    label = "Group Confined To Line",
                    description = "Flag candidates near a color group whose remaining squares are trapped in one row or column.",
                    difficultyTier = PuzzleDifficultyTier.EXTRA_EASY,
                    enabled = true,
                    sortOrder = 30,
                ),
                BuiltInSolverStepDefinition(
                    id = "single-queen-contradiction",
                    label = "Single Queen Contradiction",
                    description = "Try one queen placement. If it immediately makes the puzzle impossible, flag that square.",
                    difficultyTier = PuzzleDifficultyTier.HARD,
                    enabled = true,
                    sortOrder = 40,
                ),
                BuiltInSolverStepDefinition(
                    id = "assume-progress",
                    label = "Assume Queen Until Progress",
                    description = "Try queen assumptions until one contradiction forces a real move.",
                    difficultyTier = PuzzleDifficultyTier.UNSOLVABLE,
                    enabled = true,
                    sortOrder = 50,
                ),
                BuiltInSolverStepDefinition(
                    id = "assume-exhaustive",
                    label = "Assume Queen Exhaustive",
                    description = "Exhaustively scan queen and flag assumptions until no further forced move exists.",
                    difficultyTier = PuzzleDifficultyTier.UNSOLVABLE,
                    enabled = true,
                    sortOrder = 60,
                ),
            )
    }

    fun loadConfig(): SolverConfig =
        SolverConfig(
            builtInSteps = builtInSolverSteps(),
            patterns = solverPatternCatalogService.findAll(),
        )

    fun builtInSolverSteps(): List<BuiltInSolverStepDefinition> = defaultBuiltInSolverSteps()
}
