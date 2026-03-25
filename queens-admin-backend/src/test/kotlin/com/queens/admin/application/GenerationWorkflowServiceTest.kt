package com.queens.admin.application

import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.service.BlockedSquareExpansionService
import com.queens.admin.domain.service.BoardFactoryService
import com.queens.admin.domain.service.BoardValidationService
import com.queens.admin.domain.service.ColorExpansionService
import com.queens.admin.domain.service.InitialColorAssignmentService
import com.queens.admin.domain.service.QueenPlacementService
import com.queens.admin.domain.service.ValidatedPuzzleGenerationService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class GenerationWorkflowServiceTest {
    private val boardValidationService = BoardValidationService()
    private val boardFactoryService = BoardFactoryService()
    private val generationWorkflowService = GenerationWorkflowService(
        queenPlacementService = QueenPlacementService(boardValidationService),
        initialColorAssignmentService = InitialColorAssignmentService(boardValidationService),
        colorExpansionService = ColorExpansionService(boardValidationService),
        blockedSquareExpansionService = BlockedSquareExpansionService(boardValidationService),
        validatedPuzzleGenerationService = ValidatedPuzzleGenerationService(
            boardFactoryService = boardFactoryService,
            boardValidationService = boardValidationService,
        ),
    )

    @Test
    fun `generateValidBoard returns full solvable 4x4 board`() {
        val result = generationWorkflowService.generateValidBoard(4)

        assertTrue(result.success, "expected generation to succeed")
        val boardState = requireNotNull(result.boardState)
        assertEquals(4, boardState.size)
        assertTrue(boardState.cells.flatten().all { it.groupColor != null }, "expected board to be fully colored")
        assertEquals(4, boardState.cells.flatten().count { it.markType == MarkType.QUEEN }, "expected four queen marks")
        assertEquals(4, boardState.cells.flatten().count { it.isSolutionQueen }, "expected four solution queens")
        assertTrue(boardValidationService.validate(boardState).isValid, "expected generated board to validate")
    }
}
