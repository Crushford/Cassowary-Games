package com.queens.admin.domain.service

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.solver.SolverResult
import com.queens.admin.domain.solver.SolverStep
import org.springframework.stereotype.Service

@Service
class SolverEngine(
    private val solverRuleRegistry: SolverRuleRegistry,
) {
    fun clearSolverMarks(boardState: BoardState): BoardState {
        return boardState.copy(
            cells = boardState.cells.map { row ->
                row.map { cell ->
                    if (cell.markType == MarkType.INVALID) cell.copy(markType = MarkType.NONE) else cell
                }
            },
        )
    }

    fun runNextStep(boardState: BoardState): SolverResult {
        val nextStep = solverRuleRegistry.orderedRules()
            .firstNotNullOfOrNull { rule -> rule.apply(boardState) }

        return if (nextStep == null) {
            SolverResult(
                boardState = boardState,
                steps = emptyList(),
                progressMade = false,
                solved = false,
                stuck = true,
            )
        } else {
            SolverResult(
                boardState = nextStep.boardState,
                steps = listOf(nextStep),
                progressMade = true,
                solved = false,
                stuck = false,
            )
        }
    }

    fun runSpecificRule(boardState: BoardState, ruleName: String): SolverResult {
        val rule = solverRuleRegistry.findByName(ruleName)
        val step = rule?.apply(boardState)

        return if (step == null) {
            SolverResult(
                boardState = boardState,
                steps = emptyList(),
                progressMade = false,
                solved = false,
                stuck = true,
            )
        } else {
            SolverResult(
                boardState = step.boardState,
                steps = listOf(step),
                progressMade = true,
                solved = false,
                stuck = false,
            )
        }
    }

    fun runAllStepsUntilStuck(boardState: BoardState, maxSteps: Int = 64): SolverResult {
        var currentBoard = boardState
        val steps = mutableListOf<SolverStep>()

        repeat(maxSteps) {
            val nextResult = runNextStep(currentBoard)
            if (!nextResult.progressMade) {
                return SolverResult(
                    boardState = currentBoard,
                    steps = steps.toList(),
                    progressMade = steps.isNotEmpty(),
                    solved = false,
                    stuck = true,
                )
            }

            steps += nextResult.steps
            currentBoard = nextResult.boardState
        }

        return SolverResult(
            boardState = currentBoard,
            steps = steps.toList(),
            progressMade = steps.isNotEmpty(),
            solved = false,
            stuck = true,
        )
    }
}
