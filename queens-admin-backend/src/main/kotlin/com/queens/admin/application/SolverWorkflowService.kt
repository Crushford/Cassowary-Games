package com.queens.admin.application

import com.queens.admin.domain.model.ActionType
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.OperationResult
import com.queens.admin.domain.service.BoardValidationService
import com.queens.admin.domain.service.SolverEngine
import org.springframework.stereotype.Service

@Service
class SolverWorkflowService(
    private val solverEngine: SolverEngine,
    private val boardValidationService: BoardValidationService,
) {
    fun clearSolverMarks(boardState: BoardState): OperationResult {
        val clearedBoard = solverEngine.clearSolverMarks(boardState)
        val validation = boardValidationService.validate(clearedBoard)

        return OperationResult(
            success = true,
            actionType = ActionType.CLEAR_SOLVER_MARKS,
            explanation = "Cleared all visible solver marks while keeping the hidden puzzle definition intact.",
            boardState = clearedBoard,
            warnings = validation.warnings,
            errors = validation.errors,
            validation = validation,
        )
    }

    fun runNextSolverStep(boardState: BoardState): OperationResult {
        val solverResult = solverEngine.runNextStep(boardState)
        val validation = boardValidationService.validate(solverResult.boardState)

        return OperationResult(
            success = solverResult.progressMade,
            actionType = ActionType.RUN_NEXT_SOLVER_STEP,
            explanation = solverResult.steps.firstOrNull()?.explanation ?: "No solver rule could make progress.",
            boardState = solverResult.boardState,
            changedCells = solverResult.steps.flatMap { it.changedCells },
            warnings = validation.warnings,
            errors = validation.errors,
            validation = validation,
        )
    }

    fun runSpecificSolverRule(boardState: BoardState, ruleName: String): OperationResult {
        val solverResult = solverEngine.runSpecificRule(boardState, ruleName)
        val validation = boardValidationService.validate(solverResult.boardState)

        return OperationResult(
            success = solverResult.progressMade,
            actionType = ActionType.RUN_SPECIFIC_SOLVER_RULE,
            explanation = solverResult.steps.firstOrNull()?.explanation ?: "The requested solver rule made no change.",
            boardState = solverResult.boardState,
            changedCells = solverResult.steps.flatMap { it.changedCells },
            warnings = validation.warnings,
            errors = validation.errors,
            validation = validation,
        )
    }

    fun runAllSolverSteps(boardState: BoardState): OperationResult {
        val clearedBoard = solverEngine.clearSolverMarks(boardState)
        val solverResult = solverEngine.runAllStepsUntilStuck(clearedBoard)
        val validation = boardValidationService.validate(solverResult.boardState)

        return OperationResult(
            success = solverResult.solved,
            actionType = ActionType.RUN_ALL_SOLVER_STEPS,
            explanation = if (solverResult.solved) {
                "Deterministic solver finished the puzzle without guessing."
            } else if (solverResult.progressMade) {
                "Deterministic solver made progress but got stuck before fully solving the puzzle."
            } else {
                "Deterministic solver could not make progress from a clean board."
            },
            boardState = solverResult.boardState,
            changedCells = solverResult.steps.flatMap { it.changedCells },
            warnings = validation.warnings,
            errors = validation.errors,
            validation = validation,
        )
    }
}
