package com.queens.admin.application

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.PersistedSolverPattern
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.model.PuzzleDifficultyTier
import com.queens.admin.domain.model.QueensBoardMetadata
import com.queens.admin.domain.model.QueensRuleset
import com.queens.admin.domain.solver.SolverDifficultyTier
import com.queens.admin.domain.solver.SolverResult
import com.queens.admin.domain.solver.SolverStep
import com.queens.admin.domain.service.DeterministicSolverSupportService
import com.queens.admin.domain.service.SolverEngine
import com.queens.admin.domain.service.SolverPatternService
import org.springframework.stereotype.Service

@Service
class DeterministicPuzzleAnalysisService(
    private val solverEngine: SolverEngine,
    private val solverSupportService: DeterministicSolverSupportService,
    private val solverPatternService: SolverPatternService,
    private val solverPatternCatalogService: SolverPatternCatalogService? = null,
) {
    companion object {
        private val ASSUMPTION_STEP_IDS = setOf("assume-progress", "assume-exhaustive")
    }

    data class AnalysisResult(
        val solved: Boolean,
        val difficultyTier: PuzzleDifficultyTier?,
        val hardestTierUsed: SolverDifficultyTier?,
        val stepsTaken: Int,
        val finalQueensPlaced: Int,
        val unresolvedSquares: Int,
        val boardState: BoardState,
        val solverResult: SolverResult,
    )

    private data class ConfiguredAssessmentStep(
        val id: String,
        val difficultyTier: SolverDifficultyTier,
        val sortOrder: Int,
        val execute: (BoardState) -> SolverStep?,
    )

    fun solve(
        boardState: BoardState,
        maxDifficultyTier: SolverDifficultyTier = SolverDifficultyTier.EXTRA_HARD,
    ): AnalysisResult {
        val clearedBoard = solverEngine.clearSolverMarks(boardState)
        val solverResult = solverEngine.runAllStepsUntilStuck(clearedBoard, maxDifficultyTier = maxDifficultyTier)
        val hardestTierUsed = solverResult.steps
            .map { step -> step.difficultyTier }
            .filter { tier -> tier != SolverDifficultyTier.PRECHECK }
            .maxByOrNull { tier -> tier.rank }

        return AnalysisResult(
            solved = solverResult.solved,
            difficultyTier = hardestTierUsed?.toPuzzleDifficultyTier(),
            hardestTierUsed = hardestTierUsed,
            stepsTaken = solverResult.steps.size,
            finalQueensPlaced = solverSupportService.countPlacedQueens(solverResult.boardState),
            unresolvedSquares = solverResult.boardState.cells.sumOf { row ->
                row.count { cell -> cell.markType == MarkType.NONE }
            },
            boardState = solverResult.boardState,
            solverResult = solverResult,
        )
    }

    fun assessDifficulty(boardState: BoardState): AnalysisResult {
        val normalizedBoard = boardState.copy(
            metadata = QueensBoardMetadata.metadata(
                boardSize = boardState.size,
                targetQueenCount = QueensBoardMetadata.targetQueenCount(boardState),
                orthogonalMinDistance = QueensBoardMetadata.orthogonalMinDistance(boardState),
            ),
        )
        val clearedBoard = solverEngine.clearSolverMarks(normalizedBoard)
        val configuredSteps = configuredAssessmentSteps()
        var currentBoard = clearedBoard
        var unlockedTier = SolverDifficultyTier.EASY
        val steps = mutableListOf<SolverStep>()

        while (unlockedTier != SolverDifficultyTier.UNSOLVABLE) {
            val precheckStep = applyPrecheckStep(currentBoard)
            if (precheckStep != null) {
                steps += precheckStep
                currentBoard = precheckStep.boardState
                continue
            }

            if (solverSupportService.isSolved(currentBoard)) {
                return buildConfiguredAnalysisResult(
                    boardState = currentBoard,
                    steps = steps,
                    solved = true,
                    unlockedTier = unlockedTier,
                )
            }

            val singleColorStep = applySingleColorStep(currentBoard)
            if (singleColorStep != null) {
                steps += singleColorStep
                currentBoard = singleColorStep.boardState
                continue
            }

            val nextConfiguredStep = configuredSteps
                .filter { step -> unlockedTier.includes(step.difficultyTier) }
                .firstNotNullOfOrNull { step -> step.execute(currentBoard) }

            if (nextConfiguredStep != null) {
                steps += nextConfiguredStep
                currentBoard = nextConfiguredStep.boardState
                continue
            }

            val nextTier = nextAssessmentTier(unlockedTier)
            if (nextTier == null) {
                return buildConfiguredAnalysisResult(
                    boardState = currentBoard,
                    steps = steps,
                    solved = false,
                    unlockedTier = unlockedTier,
                )
            }
            unlockedTier = nextTier
        }

        return buildConfiguredAnalysisResult(
            boardState = currentBoard,
            steps = steps,
            solved = false,
            unlockedTier = unlockedTier,
        )
    }

    private fun buildConfiguredAnalysisResult(
        boardState: BoardState,
        steps: List<SolverStep>,
        solved: Boolean,
        unlockedTier: SolverDifficultyTier,
    ): AnalysisResult {
        val hardestTierUsed = steps
            .map { step -> step.difficultyTier }
            .filter { tier -> tier != SolverDifficultyTier.PRECHECK }
            .maxByOrNull { tier -> tier.rank }
        val difficultyTier =
            when {
                !solved -> PuzzleDifficultyTier.UNSOLVABLE
                steps.any { step -> step.ruleName in ASSUMPTION_STEP_IDS } -> PuzzleDifficultyTier.UNSOLVABLE
                unlockedTier == SolverDifficultyTier.EXTRA_HARD -> PuzzleDifficultyTier.EXTRA_HARD
                unlockedTier == SolverDifficultyTier.HARD -> PuzzleDifficultyTier.HARD
                unlockedTier == SolverDifficultyTier.MEDIUM -> PuzzleDifficultyTier.MEDIUM
                else -> PuzzleDifficultyTier.EASY
            }

        return AnalysisResult(
            solved = solved,
            difficultyTier = difficultyTier,
            hardestTierUsed = hardestTierUsed,
            stepsTaken = steps.size,
            finalQueensPlaced = solverSupportService.countPlacedQueens(boardState),
            unresolvedSquares = boardState.cells.sumOf { row ->
                row.count { cell -> cell.markType == MarkType.NONE }
            },
            boardState = boardState,
            solverResult = SolverResult(
                boardState = boardState,
                steps = steps,
                progressMade = steps.isNotEmpty(),
                solved = solved,
                stuck = !solved,
                maxDifficultyTier = unlockedTier,
            ),
        )
    }

    private fun configuredAssessmentSteps(): List<ConfiguredAssessmentStep> {
        val builtInSteps = SolverConfigService.defaultBuiltInSolverSteps()
            .filter { step -> step.enabled && step.id != "single-color" && step.difficultyTier != PuzzleDifficultyTier.UNSOLVABLE }
            .map { step ->
                ConfiguredAssessmentStep(
                    id = step.id,
                    difficultyTier = step.difficultyTier.toSolverDifficultyTier(),
                    sortOrder = step.sortOrder,
                    execute = { boardState -> executeBuiltInConfiguredStep(step.id, step.difficultyTier, boardState) },
                )
            }
        val patternSteps = solverPatternCatalogService
            ?.findAll()
            ?.filter { pattern -> pattern.enabled && pattern.difficultyTier != PuzzleDifficultyTier.UNSOLVABLE }
            ?.map { pattern ->
                ConfiguredAssessmentStep(
                    id = pattern.id,
                    difficultyTier = pattern.difficultyTier.toSolverDifficultyTier(),
                    sortOrder = pattern.sortOrder,
                    execute = { boardState -> executePatternStep(pattern, boardState) },
                )
            }
            .orEmpty()

        return (builtInSteps + patternSteps).sortedBy { step -> step.sortOrder }
    }

    private fun executeBuiltInConfiguredStep(
        stepId: String,
        difficultyTier: PuzzleDifficultyTier,
        boardState: BoardState,
    ): SolverStep? =
        when (stepId) {
            "row-column" -> solverEngine.runSpecificRule(boardState, "constrained-lines").toSingleStepOrNull()
            "row-column-sets" -> solverEngine.runSpecificRule(boardState, "constrained-line-sets").toSingleStepOrNull()
            "group-confined-to-line" -> solverEngine.runSpecificRule(boardState, "group-confined-to-line").toSingleStepOrNull()
            "single-queen-contradiction" -> solverEngine.runSpecificRule(boardState, "queen-assumption-contradiction")
                .toSingleStepOrNull()
                ?.copy(ruleName = "single-queen-contradiction", difficultyTier = difficultyTier.toSolverDifficultyTier())
            "assume-progress" -> executeAssumeProgress(boardState, difficultyTier.toSolverDifficultyTier())
            "assume-exhaustive" -> executeAssumeExhaustive(boardState, difficultyTier.toSolverDifficultyTier())
            else -> null
        }

    private fun executeAssumeProgress(
        boardState: BoardState,
        difficultyTier: SolverDifficultyTier,
    ): SolverStep? {
        val queenAssumption = solverEngine.runSpecificRule(boardState, "queen-assumption-contradiction")
        queenAssumption.toSingleStepOrNull()?.let { step ->
            return step.copy(ruleName = "assume-progress", difficultyTier = difficultyTier)
        }

        val flagAssumption = solverEngine.runSpecificRule(boardState, "flag-assumption-contradiction")
        return flagAssumption.toSingleStepOrNull()?.copy(
            ruleName = "assume-progress",
            difficultyTier = difficultyTier,
        )
    }

    private fun executeAssumeExhaustive(
        boardState: BoardState,
        difficultyTier: SolverDifficultyTier,
    ): SolverStep? {
        var currentBoard = boardState
        val combinedChangedCells = mutableListOf<com.queens.admin.domain.model.ChangedCell>()
        var lastExplanation = "Exhaustive assumption scan made no progress."
        var progressMade = false

        while (true) {
            val queenAssumption = solverEngine.runSpecificRule(currentBoard, "queen-assumption-contradiction")
            val queenStep = queenAssumption.toSingleStepOrNull()
            if (queenStep != null) {
                currentBoard = queenStep.boardState
                combinedChangedCells += queenStep.changedCells
                lastExplanation = queenStep.explanation
                progressMade = true
                continue
            }

            val flagAssumption = solverEngine.runSpecificRule(currentBoard, "flag-assumption-contradiction")
            val flagStep = flagAssumption.toSingleStepOrNull()
            if (flagStep != null) {
                currentBoard = flagStep.boardState
                combinedChangedCells += flagStep.changedCells
                lastExplanation = flagStep.explanation
                progressMade = true
                continue
            }

            break
        }

        return if (!progressMade) {
            null
        } else {
            SolverStep(
                ruleName = "assume-exhaustive",
                difficultyTier = difficultyTier,
                explanation = lastExplanation,
                boardState = currentBoard,
                changedCells = combinedChangedCells.toList(),
            )
        }
    }

    private fun executePatternStep(
        pattern: PersistedSolverPattern,
        boardState: BoardState,
    ): SolverStep? {
        val (updatedBoard, changedCells) = solverPatternService.applyPattern(
            boardState = boardState,
            pattern = pattern.toDefinition(),
        )
        return if (changedCells.isEmpty()) {
            null
        } else {
            SolverStep(
                ruleName = pattern.id,
                difficultyTier = pattern.difficultyTier.toSolverDifficultyTier(),
                explanation = "Applied pattern ${pattern.name}.",
                boardState = updatedBoard,
                changedCells = changedCells,
            )
        }
    }

    private fun applySingleColorStep(boardState: BoardState): SolverStep? {
        for ((color, positions) in solverSupportService.groupedPositions(boardState)) {
            val queensInGroup = positions.count { position ->
                boardState.cells[position.row][position.col].markType == MarkType.QUEEN
            }
            if (queensInGroup >= 1) continue

            val candidates = solverSupportService.candidatePositions(boardState, positions)
            if (candidates.size != 1) continue

            val target = candidates.single()
            val (updatedBoard, changedCells) = solverSupportService.placeQueen(
                boardState = boardState,
                row = target.row,
                col = target.col,
                explanation = "Placed a queen because color group $color had exactly one candidate left.",
                queenChangeType = "SOLVER_SINGLE_COLOR_QUEEN",
                flagChangeType = "SOLVER_SINGLE_COLOR_FLAG",
            )
            return SolverStep(
                ruleName = "single-color",
                difficultyTier = SolverDifficultyTier.EASY,
                explanation = "Placed a queen in color group $color because it had one candidate left.",
                boardState = updatedBoard,
                changedCells = changedCells,
            )
        }

        return null
    }

    private fun applyPrecheckStep(boardState: BoardState): SolverStep? =
        solverEngine.runSpecificRule(
            boardState = boardState,
            ruleName = "flag-squares-without-color-groups",
            maxDifficultyTier = SolverDifficultyTier.PRECHECK,
        ).toSingleStepOrNull()

    private fun nextAssessmentTier(currentTier: SolverDifficultyTier): SolverDifficultyTier? =
        when (currentTier) {
            SolverDifficultyTier.EASY -> SolverDifficultyTier.MEDIUM
            SolverDifficultyTier.MEDIUM -> SolverDifficultyTier.HARD
            SolverDifficultyTier.HARD -> SolverDifficultyTier.EXTRA_HARD
            SolverDifficultyTier.EXTRA_HARD,
            SolverDifficultyTier.UNSOLVABLE,
            SolverDifficultyTier.PRECHECK,
            -> null
        }

    private fun SolverResult.toSingleStepOrNull(): SolverStep? = steps.firstOrNull()

    private fun PersistedSolverPattern.toDefinition(): SolverPatternService.SolverPatternDefinition =
        SolverPatternService.SolverPatternDefinition(
            id = id,
            size = size,
            cells = cells.map { cell ->
                SolverPatternService.SolverPatternCell(
                    row = cell.row,
                    col = cell.col,
                    activeSquare = cell.activeSquare,
                )
            },
            outputFlags = outputFlags.map { flag ->
                SolverPatternService.SolverPatternOffset(
                    row = flag.row,
                    col = flag.col,
                )
            },
        )

    private fun PuzzleDifficultyTier.toSolverDifficultyTier(): SolverDifficultyTier =
        when (this) {
            PuzzleDifficultyTier.EASY -> SolverDifficultyTier.EASY
            PuzzleDifficultyTier.MEDIUM -> SolverDifficultyTier.MEDIUM
            PuzzleDifficultyTier.HARD -> SolverDifficultyTier.HARD
            PuzzleDifficultyTier.EXTRA_HARD -> SolverDifficultyTier.EXTRA_HARD
            PuzzleDifficultyTier.UNSOLVABLE -> SolverDifficultyTier.UNSOLVABLE
        }

    fun withRuleset(boardState: BoardState, ruleset: QueensRuleset, targetQueenCount: Int): BoardState =
        boardState.copy(
            metadata = QueensBoardMetadata.metadata(
                boardSize = boardState.size,
                targetQueenCount = targetQueenCount,
                orthogonalMinDistance = ruleset.orthogonalMinDistance,
            ),
        )
}
