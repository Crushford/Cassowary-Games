package com.queens.admin.application

import com.queens.admin.domain.model.ActionType
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.OperationResult
import com.queens.admin.domain.service.BoardValidationService
import com.queens.admin.domain.service.DeterministicSolverSupportService
import com.queens.admin.domain.service.SolverPatternService
import com.queens.admin.domain.service.SolverEngine
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class SolverWorkflowService(
    private val solverEngine: SolverEngine,
    private val boardValidationService: BoardValidationService,
    private val deterministicSolverSupportService: DeterministicSolverSupportService,
    private val solverPatternService: SolverPatternService,
) {
    private val logger = LoggerFactory.getLogger(javaClass)

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
        logger.info(
            "[SolverWorkflowService] runSpecificSolverRule ruleName={} size={} queensPlaced={} targetQueenCount={} flagsPlaced={}",
            ruleName,
            boardState.size,
            deterministicSolverSupportService.countPlacedQueens(boardState),
            deterministicSolverSupportService.targetQueenCount(boardState),
            boardState.cells.sumOf { row -> row.count { cell -> cell.markType == com.queens.admin.domain.model.MarkType.FLAG } },
        )
        val solverResult = solverEngine.runSpecificRule(boardState, ruleName)
        val validation = boardValidationService.validate(solverResult.boardState)
        logger.info(
            "[SolverWorkflowService] runSpecificSolverRule result ruleName={} progressMade={} changedCells={} explanation={}",
            ruleName,
            solverResult.progressMade,
            solverResult.steps.flatMap { it.changedCells }.size,
            solverResult.steps.firstOrNull()?.explanation ?: "no-step",
        )

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

    fun runSingleColorGroupSolverRule(boardState: BoardState): OperationResult {
        for ((color, positions) in deterministicSolverSupportService.groupedPositions(boardState)) {
            val candidates = deterministicSolverSupportService.candidatePositions(boardState, positions)
            if (candidates.size != 1) continue

            val target = candidates.single()
            val (updatedBoard, changedCells) =
                deterministicSolverSupportService.placeQueen(
                    boardState = boardState,
                    row = target.row,
                    col = target.col,
                    explanation = "Placed a queen because color group $color had exactly one candidate left.",
                    queenChangeType = "SOLVER_SINGLE_COLOR_QUEEN",
                    flagChangeType = "SOLVER_SINGLE_COLOR_FLAG",
                )
            val validation = boardValidationService.validate(updatedBoard)

            return OperationResult(
                success = true,
                actionType = ActionType.RUN_SINGLE_COLOR_GROUP_SOLVER_RULE,
                explanation = "Placed a queen in color group $color because it had one candidate left.",
                boardState = updatedBoard,
                changedCells = changedCells,
                warnings = validation.warnings,
                errors = validation.errors,
                validation = validation,
            )
        }

        val validation = boardValidationService.validate(boardState)
        return OperationResult(
            success = false,
            actionType = ActionType.RUN_SINGLE_COLOR_GROUP_SOLVER_RULE,
            explanation = "No color group had exactly one remaining candidate.",
            boardState = boardState,
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

    fun runSolverPattern(
        boardState: BoardState,
        pattern: SolverPatternService.SolverPatternDefinition,
    ): OperationResult {
        val (updatedBoard, changedCells) = solverPatternService.applyPattern(boardState, pattern)
        val validation = boardValidationService.validate(updatedBoard)

        return OperationResult(
            success = changedCells.isNotEmpty(),
            actionType = ActionType.RUN_PATTERN_SOLVER_RULE,
            explanation =
                if (changedCells.isEmpty()) {
                    "The selected pattern did not place any flags."
                } else {
                    "Applied the selected pattern and placed ${changedCells.size} flag${if (changedCells.size == 1) "" else "s"}."
                },
            boardState = updatedBoard,
            changedCells = changedCells,
            warnings = validation.warnings,
            errors = validation.errors,
            validation = validation,
        )
    }
}
