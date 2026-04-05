package com.queens.admin.application

import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.service.BlockedSquareExpansionService
import com.queens.admin.domain.service.BoardFactoryService
import com.queens.admin.domain.service.BoardValidationService
import com.queens.admin.domain.service.ColorExpansionService
import com.queens.admin.domain.service.InitialColorAssignmentService
import com.queens.admin.domain.service.QueensConstraintService
import com.queens.admin.domain.service.QueenPlacementService
import com.queens.admin.domain.service.ValidatedPuzzleGenerationService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.math.abs

class GenerationWorkflowServiceTest {
    private val queensConstraintService = QueensConstraintService()
    private val boardValidationService = BoardValidationService(queensConstraintService)
    private val boardFactoryService = BoardFactoryService()
    private val validatedPuzzleGenerationService = ValidatedPuzzleGenerationService(
        boardFactoryService = boardFactoryService,
        boardValidationService = boardValidationService,
        queensConstraintService = queensConstraintService,
    )
    private val generationWorkflowService = GenerationWorkflowService(
        queenPlacementService = QueenPlacementService(boardValidationService),
        initialColorAssignmentService = InitialColorAssignmentService(boardValidationService),
        colorExpansionService = ColorExpansionService(boardValidationService),
        blockedSquareExpansionService = BlockedSquareExpansionService(boardValidationService),
        validatedPuzzleGenerationService = validatedPuzzleGenerationService,
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

    @Test
    fun `generateValidBoard returns full solvable 6x6 board`() {
        val result = generationWorkflowService.generateValidBoard(6)

        assertTrue(result.success, "expected generation to succeed")
        val boardState = requireNotNull(result.boardState)
        assertEquals(6, boardState.size)
        assertTrue(boardState.cells.flatten().all { it.groupColor != null }, "expected board to be fully colored")
        assertEquals(6, boardState.cells.flatten().count { it.markType == MarkType.QUEEN }, "expected six queen marks")
        assertEquals(6, boardState.cells.flatten().count { it.isSolutionQueen }, "expected six solution queens")
        assertTrue(boardValidationService.validate(boardState).isValid, "expected generated board to validate")
    }

    @Test
    fun `placeQueens places one queen per row and column without diagonal touching`() {
        val emptyBoard = boardFactoryService.createEmptyBoard(6)

        val result = generationWorkflowService.placeQueens(emptyBoard)

        assertTrue(result.success)
        val boardState = requireNotNull(result.boardState)
        val queens = queenPositions(boardState)
        assertEquals(6, queens.size)
        assertEquals(6, queens.map { it.row }.distinct().size)
        assertEquals(6, queens.map { it.col }.distinct().size)
        assertTrue(
            queens.none { left ->
                queens.any { right ->
                    left != right && abs(left.row - right.row) == 1 && abs(left.col - right.col) == 1
                }
            },
        )
    }

    @Test
    fun `assignInitialColors gives each queen a unique color group`() {
        val queensBoard = requireNotNull(
            generationWorkflowService.placeQueens(boardFactoryService.createEmptyBoard(6)).boardState,
        )

        val result = generationWorkflowService.assignInitialColors(queensBoard)

        assertTrue(result.success)
        val boardState = requireNotNull(result.boardState)
        val queenCells = boardState.cells.flatten().filter { it.isSolutionQueen }
        assertEquals(6, queenCells.size)
        assertEquals(6, queenCells.mapNotNull { it.groupColor }.distinct().size)
        assertTrue(queenCells.all { it.groupColor != null })
    }

    @Test
    fun `expandAllGroupsOnce preserves existing queens and their colors`() {
        val seededBoard = requireNotNull(
            generationWorkflowService.assignInitialColors(
                requireNotNull(
                    generationWorkflowService.placeQueens(boardFactoryService.createEmptyBoard(6)).boardState,
                ),
            ).boardState,
        )
        val originalQueenCells = seededBoard.cells.flatten()
            .filter { it.isSolutionQueen }
            .associateBy({ it.position }, { requireNotNull(it.groupColor) })

        val result = generationWorkflowService.expandAllGroupsOnce(seededBoard)

        assertTrue(result.success)
        val boardState = requireNotNull(result.boardState)
        assertTrue(result.changedCells.isNotEmpty(), "expected at least one expansion")
        originalQueenCells.forEach { (position, color) ->
            val cell = boardState.cells[position.row][position.col]
            assertTrue(cell.isSolutionQueen, "expected queen to remain at $position")
            assertEquals(color, cell.groupColor, "expected queen color to remain unchanged at $position")
        }
        assertTrue(
            boardState.cells.flatten().count { it.groupColor != null } >= seededBoard.cells.flatten().count { it.groupColor != null },
            "expected color expansion to preserve or increase colored squares",
        )
    }

    @Test
    fun `validated generator can run with a smaller orthogonal distance`() {
        val result = validatedPuzzleGenerationService.generateValidBoard(
            size = 4,
            orthogonalMinDistance = 2,
            maxRetries = 2_000,
        )

        assertTrue(result.success, "expected generation to succeed with a smaller orthogonal distance")
        val boardState = requireNotNull(result.boardState)
        assertTrue(
            boardValidationService.validate(
                boardState = boardState,
                orthogonalMinDistance = 2,
            ).isValid,
            "expected generated board to validate under the requested distance",
        )
    }

    private fun queenPositions(boardState: com.queens.admin.domain.model.BoardState): List<Position> =
        boardState.cells.flatten()
            .filter { it.isSolutionQueen }
            .map { it.position }
}
