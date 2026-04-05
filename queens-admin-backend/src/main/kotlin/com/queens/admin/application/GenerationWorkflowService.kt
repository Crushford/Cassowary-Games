package com.queens.admin.application

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.OperationResult
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.service.BlockedSquareExpansionService
import com.queens.admin.domain.service.ColorExpansionService
import com.queens.admin.domain.service.InitialColorAssignmentService
import com.queens.admin.domain.service.QueenPlacementService
import com.queens.admin.domain.service.ValidatedPuzzleGenerationService
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
        minimumGroupSize: Int = 3,
        generationStrategy: String = "baseline",
        seedTemplateOffsets: List<Position>? = null,
    ): OperationResult =
        validatedPuzzleGenerationService.generateValidBoard(
            size = size,
            minimumGroupSize = minimumGroupSize,
            generationStrategy = generationStrategy,
            seedTemplateOffsets = seedTemplateOffsets,
        )

    fun generateValidBoard(
        size: Int,
        minimumGroupSize: Int,
        generationStrategy: String,
        seedTemplateOffsets: List<Position>? = null,
        progressListener: ((GenerationProgressUpdate) -> Unit)?,
        isCancelled: (() -> Boolean)?,
    ): OperationResult =
        validatedPuzzleGenerationService.generateValidBoard(
            size = size,
            minimumGroupSize = minimumGroupSize,
            generationStrategy = generationStrategy,
            seedTemplateOffsets = seedTemplateOffsets,
            progressListener = progressListener,
            isCancelled = isCancelled,
        )

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
