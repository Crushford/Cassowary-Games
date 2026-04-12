package com.queens.admin.application

import com.queens.admin.domain.model.ActionType
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.OperationResult
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.service.BlockedSquareExpansionService
import com.queens.admin.domain.service.ColorExpansionService
import com.queens.admin.domain.service.InitialColorAssignmentService
import com.queens.admin.domain.service.QueenPlacementService
import com.queens.admin.domain.service.ValidatedPuzzleGenerationService
import com.queens.admin.domain.model.QueensRuleset
import java.time.Duration
import java.time.Instant
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class GenerationWorkflowService(
    private val queenPlacementService: QueenPlacementService,
    private val initialColorAssignmentService: InitialColorAssignmentService,
    private val colorExpansionService: ColorExpansionService,
    private val blockedSquareExpansionService: BlockedSquareExpansionService,
    private val validatedPuzzleGenerationService: ValidatedPuzzleGenerationService,
) {
    data class MaxQueenResolutionResult(
        val size: Int,
        val orthogonalMinDistance: Int,
        val maxQueenCount: Int,
        val elapsedMs: Long,
    )

    companion object {
        private val logger = LoggerFactory.getLogger(GenerationWorkflowService::class.java)
    }

    private fun unsupportedMaxGenerationResult(size: Int, orthogonalMinDistance: Int): OperationResult {
        val supportedDistances = queenPlacementService.supportedPrecomputedDistances(size)
        val error =
            if (supportedDistances.isEmpty()) {
                "Max queen mode is not available yet for ${size}x$size boards."
            } else {
                "Max queen mode is only available for ${size}x$size with orthogonal distances ${supportedDistances.joinToString(", ")}."
            }
        return OperationResult(
            success = false,
            actionType = ActionType.GENERATE_VALID_BOARD,
            explanation = error,
            boardState = null,
            errors = listOf(error),
        )
    }

    fun generateValidBoard(
        size: Int,
        queenCountMode: String = "exact",
        targetQueenCount: Int = size,
        orthogonalMinDistance: Int = size,
        minimumGroupSize: Int = 3,
        generationStrategy: String = "baseline",
        seedTemplateOffsets: List<Position>? = null,
        targetQueenResolutionListener: ((String) -> Unit)? = null,
    ): OperationResult {
        if (
            queenCountMode.equals("max", ignoreCase = true) &&
            !queenPlacementService.hasPrecomputedMaxQueenCount(size, orthogonalMinDistance)
        ) {
            return unsupportedMaxGenerationResult(size, orthogonalMinDistance)
        }
        logger.info(
            "Generation request starting target queen resolution size={} queenCountMode={} requestedTargetQueenCount={} orthogonalMinDistance={} minimumGroupSize={} strategy={}",
            size,
            queenCountMode,
            targetQueenCount,
            orthogonalMinDistance,
            minimumGroupSize,
            generationStrategy,
        )
        val resolvedTargetQueenCount = queenPlacementService.resolveTargetQueenCount(
            size = size,
            requestedTargetQueenCount = targetQueenCount,
            queenCountMode = queenCountMode,
            ruleset = QueensRuleset(
                orthogonalMinDistance = orthogonalMinDistance,
                forbidDiagonalTouch = true,
                requireRowCoverage = false,
                requireColumnCoverage = false,
            ),
            progressListener = targetQueenResolutionListener,
        )
        logger.info(
            "Generation request received size={} queenCountMode={} requestedTargetQueenCount={} resolvedTargetQueenCount={} orthogonalMinDistance={} minimumGroupSize={} strategy={}",
            size,
            queenCountMode,
            targetQueenCount,
            resolvedTargetQueenCount,
            orthogonalMinDistance,
            minimumGroupSize,
            generationStrategy,
        )
        return validatedPuzzleGenerationService.generateValidBoard(
            size = size,
            targetQueenCount = resolvedTargetQueenCount,
            orthogonalMinDistance = orthogonalMinDistance,
            minimumGroupSize = minimumGroupSize,
            generationStrategy = generationStrategy,
            seedTemplateOffsets = seedTemplateOffsets,
        )
    }

    fun resolveMaxQueenCount(
        size: Int,
        orthogonalMinDistance: Int = size,
        progressListener: ((String) -> Unit)? = null,
    ): MaxQueenResolutionResult {
        val startedAt = Instant.now()
        val resolvedTargetQueenCount = queenPlacementService.resolveTargetQueenCount(
            size = size,
            requestedTargetQueenCount = size,
            queenCountMode = "max",
            ruleset = QueensRuleset(
                orthogonalMinDistance = orthogonalMinDistance,
                forbidDiagonalTouch = true,
                requireRowCoverage = false,
                requireColumnCoverage = false,
            ),
            progressListener = progressListener,
            allowExpensiveSearch = true,
        )
        return MaxQueenResolutionResult(
            size = size,
            orthogonalMinDistance = orthogonalMinDistance,
            maxQueenCount = resolvedTargetQueenCount,
            elapsedMs = Duration.between(startedAt, Instant.now()).toMillis(),
        )
    }

    fun generateValidBoard(
        size: Int,
        queenCountMode: String,
        targetQueenCount: Int,
        orthogonalMinDistance: Int,
        minimumGroupSize: Int,
        generationStrategy: String,
        seedTemplateOffsets: List<Position>? = null,
        progressListener: ((GenerationProgressUpdate) -> Unit)?,
        isCancelled: (() -> Boolean)?,
        targetQueenResolutionListener: ((String) -> Unit)? = null,
    ): OperationResult {
        if (
            queenCountMode.equals("max", ignoreCase = true) &&
            !queenPlacementService.hasPrecomputedMaxQueenCount(size, orthogonalMinDistance)
        ) {
            return unsupportedMaxGenerationResult(size, orthogonalMinDistance)
        }
        logger.info(
            "Generation job request starting target queen resolution size={} queenCountMode={} requestedTargetQueenCount={} orthogonalMinDistance={} minimumGroupSize={} strategy={} progressUpdates={}",
            size,
            queenCountMode,
            targetQueenCount,
            orthogonalMinDistance,
            minimumGroupSize,
            generationStrategy,
            progressListener != null,
        )
        val resolvedTargetQueenCount = queenPlacementService.resolveTargetQueenCount(
            size = size,
            requestedTargetQueenCount = targetQueenCount,
            queenCountMode = queenCountMode,
            ruleset = QueensRuleset(
                orthogonalMinDistance = orthogonalMinDistance,
                forbidDiagonalTouch = true,
                requireRowCoverage = false,
                requireColumnCoverage = false,
            ),
            progressListener = targetQueenResolutionListener,
        )
        logger.info(
            "Generation job request received size={} queenCountMode={} requestedTargetQueenCount={} resolvedTargetQueenCount={} orthogonalMinDistance={} minimumGroupSize={} strategy={} progressUpdates={}",
            size,
            queenCountMode,
            targetQueenCount,
            resolvedTargetQueenCount,
            orthogonalMinDistance,
            minimumGroupSize,
            generationStrategy,
            progressListener != null,
        )
        return validatedPuzzleGenerationService.generateValidBoard(
            size = size,
            targetQueenCount = resolvedTargetQueenCount,
            orthogonalMinDistance = orthogonalMinDistance,
            minimumGroupSize = minimumGroupSize,
            generationStrategy = generationStrategy,
            seedTemplateOffsets = seedTemplateOffsets,
            progressListener = progressListener,
            isCancelled = isCancelled,
        )
    }

    fun placeQueens(boardState: BoardState): OperationResult =
        queenPlacementService.placeQueens(boardState)

    fun assignInitialColors(boardState: BoardState): OperationResult =
        initialColorAssignmentService.assignInitialColors(boardState)

    fun expandAllGroupsOnce(boardState: BoardState): OperationResult =
        colorExpansionService.expandAllGroupsOnce(boardState)

    fun expandSelectedGroup(boardState: BoardState, targetColor: String?): OperationResult =
        colorExpansionService.expandSelectedGroup(boardState, targetColor)

    fun expandBlockedSquares(boardState: BoardState): OperationResult =
        blockedSquareExpansionService.expandBlockedSquares(boardState)
}
