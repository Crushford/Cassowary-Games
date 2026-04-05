package com.queens.admin.domain.service

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.solver.SolverDifficultyTier
import com.queens.admin.domain.solver.SolverResult
import com.queens.admin.domain.solver.SolverStep
import org.springframework.stereotype.Service

@Service
class SolverEngine(
    private val solverRuleRegistry: SolverRuleRegistry,
    private val solverSupportService: DeterministicSolverSupportService,
) {
    fun clearSolverMarks(boardState: BoardState): BoardState {
        return solverSupportService.clearAllMarks(boardState)
    }

    fun runNextStep(
        boardState: BoardState,
        maxDifficultyTier: SolverDifficultyTier = SolverDifficultyTier.HARD,
    ): SolverResult {
        val nextStep = solverRuleRegistry.orderedRules(maxDifficultyTier)
            .firstNotNullOfOrNull { rule ->
                rule.apply(boardState)?.takeIf { step -> step.changedCells.isNotEmpty() }
            }

        return if (nextStep == null) {
            SolverResult(
                boardState = boardState,
                steps = emptyList(),
                progressMade = false,
                solved = solverSupportService.isSolved(boardState),
                stuck = true,
                maxDifficultyTier = maxDifficultyTier,
            )
        } else {
            SolverResult(
                boardState = nextStep.boardState,
                steps = listOf(nextStep),
                progressMade = true,
                solved = solverSupportService.isSolved(nextStep.boardState),
                stuck = false,
                maxDifficultyTier = maxDifficultyTier,
            )
        }
    }

    fun runSpecificRule(
        boardState: BoardState,
        ruleName: String,
        maxDifficultyTier: SolverDifficultyTier = SolverDifficultyTier.HARD,
    ): SolverResult {
        val rule = solverRuleRegistry.findByName(ruleName, maxDifficultyTier)
        val step = rule?.apply(boardState)

        return if (step == null) {
            SolverResult(
                boardState = boardState,
                steps = emptyList(),
                progressMade = false,
                solved = solverSupportService.isSolved(boardState),
                stuck = true,
                maxDifficultyTier = maxDifficultyTier,
            )
        } else {
            SolverResult(
                boardState = step.boardState,
                steps = listOf(step),
                progressMade = true,
                solved = solverSupportService.isSolved(step.boardState),
                stuck = false,
                maxDifficultyTier = maxDifficultyTier,
            )
        }
    }

    fun runAllStepsUntilStuck(
        boardState: BoardState,
        maxDifficultyTier: SolverDifficultyTier = SolverDifficultyTier.HARD,
        maxSteps: Int = 256,
    ): SolverResult {
        var currentBoard = boardState
        val steps = mutableListOf<SolverStep>()

        repeat(maxSteps) {
            val nextResult = runNextStep(currentBoard, maxDifficultyTier)
            if (!nextResult.progressMade) {
                return SolverResult(
                    boardState = currentBoard,
                    steps = steps.toList(),
                    progressMade = steps.isNotEmpty(),
                    solved = solverSupportService.isSolved(currentBoard),
                    stuck = true,
                    maxDifficultyTier = maxDifficultyTier,
                )
            }

            steps += nextResult.steps
            currentBoard = nextResult.boardState
            if (solverSupportService.isSolved(currentBoard)) {
                return SolverResult(
                    boardState = currentBoard,
                    steps = steps.toList(),
                    progressMade = true,
                    solved = true,
                    stuck = false,
                    maxDifficultyTier = maxDifficultyTier,
                )
            }
        }

        return SolverResult(
            boardState = currentBoard,
            steps = steps.toList(),
            progressMade = steps.isNotEmpty(),
            solved = solverSupportService.isSolved(currentBoard),
            stuck = true,
            maxDifficultyTier = maxDifficultyTier,
        )
    }
}
