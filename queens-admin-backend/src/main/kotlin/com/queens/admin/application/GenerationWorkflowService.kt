package com.queens.admin.application

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.OperationResult
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.service.BlockedSquareExpansionService
import com.queens.admin.domain.service.ColorExpansionService
import com.queens.admin.domain.service.InitialColorAssignmentService
import com.queens.admin.domain.service.QueenPlacementService
import com.queens.admin.domain.service.ValidatedPuzzleGenerationService
import com.queens.admin.domain.model.QueensRuleset
import org.springframework.stereotype.Service

@Service
class GenerationWorkflowService(
    private val queenPlacementService: QueenPlacementService,
    private val initialColorAssignmentService: InitialColorAssignmentService,
    private val colorExpansionService: ColorExpansionService,
    private val blockedSquareExpansionService: BlockedSquareExpansionService,
    private val validatedPuzzleGenerationService: ValidatedPuzzleGenerationService,
) {
    fun generateValidBoard(
        size: Int,
        queenCountMode: String = "exact",
        targetQueenCount: Int = size,
        orthogonalMinDistance: Int = size,
        minimumGroupSize: Int = 3,
        generationStrategy: String = "baseline",
        seedTemplateOffsets: List<Position>? = null,
    ): OperationResult {
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
    ): OperationResult {
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
