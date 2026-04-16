package com.queens.admin.application

import com.queens.admin.api.dto.StitchingPreviewQuadrantDto
import com.queens.admin.domain.service.BlockedSquareExpansionService
import com.queens.admin.domain.service.BoardFactoryService
import com.queens.admin.domain.service.BoardValidationService
import com.queens.admin.domain.service.ColorExpansionService
import com.queens.admin.domain.service.DeterministicSolverSupportService
import com.queens.admin.domain.service.InitialColorAssignmentService
import com.queens.admin.domain.service.QueensConstraintService
import com.queens.admin.domain.service.QueenPlacementService
import com.queens.admin.domain.service.SolverEngine
import com.queens.admin.domain.service.SolverPatternService
import com.queens.admin.domain.service.SolverRuleRegistry
import com.queens.admin.domain.service.ValidatedPuzzleGenerationService
import com.queens.admin.domain.solver.rules.AxisIsolationForcedQueenRule
import com.queens.admin.domain.solver.rules.ConstrainedLineSetsRule
import com.queens.admin.domain.solver.rules.ConstrainedLinesRule
import com.queens.admin.domain.solver.rules.ConstrainedWindowRule
import com.queens.admin.domain.solver.rules.FlagAssumptionContradictionRule
import com.queens.admin.domain.solver.rules.FlagSquaresWithoutColorGroupsRule
import com.queens.admin.domain.solver.rules.ForcedCoverageQueenRule
import com.queens.admin.domain.solver.rules.GroupConfinedToLineRule
import com.queens.admin.domain.solver.rules.PlaceLastFreeQueensRule
import com.queens.admin.domain.solver.rules.QueenAssumptionContradictionRule
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class StitchingPreviewServiceTest {
    private val queensConstraintService = QueensConstraintService()
    private val boardValidationService = BoardValidationService(queensConstraintService)
    private val boardFactoryService = BoardFactoryService()
    private val deterministicSolverSupportService = DeterministicSolverSupportService(queensConstraintService)
    private val solverRuleRegistry = SolverRuleRegistry(
        listOf(
            FlagSquaresWithoutColorGroupsRule(deterministicSolverSupportService),
            PlaceLastFreeQueensRule(deterministicSolverSupportService),
            ForcedCoverageQueenRule(deterministicSolverSupportService),
            AxisIsolationForcedQueenRule(deterministicSolverSupportService),
            GroupConfinedToLineRule(deterministicSolverSupportService),
            ConstrainedLinesRule(deterministicSolverSupportService),
            ConstrainedLineSetsRule(deterministicSolverSupportService),
            QueenAssumptionContradictionRule(deterministicSolverSupportService),
            FlagAssumptionContradictionRule(deterministicSolverSupportService),
            ConstrainedWindowRule(deterministicSolverSupportService),
        ),
    )
    private val solverEngine = SolverEngine(solverRuleRegistry, deterministicSolverSupportService)
    private val solverPatternService = SolverPatternService(deterministicSolverSupportService)
    private val deterministicPuzzleAnalysisService = DeterministicPuzzleAnalysisService(
        solverEngine = solverEngine,
        solverSupportService = deterministicSolverSupportService,
        solverPatternService = solverPatternService,
    )
    private val validatedPuzzleGenerationService = ValidatedPuzzleGenerationService(
        boardFactoryService = boardFactoryService,
        boardValidationService = boardValidationService,
        queensConstraintService = queensConstraintService,
        deterministicPuzzleAnalysisService = deterministicPuzzleAnalysisService,
    )
    private val generationWorkflowService = GenerationWorkflowService(
        queenPlacementService = QueenPlacementService(boardValidationService, queensConstraintService),
        initialColorAssignmentService = InitialColorAssignmentService(boardValidationService),
        colorExpansionService = ColorExpansionService(boardValidationService),
        blockedSquareExpansionService = BlockedSquareExpansionService(boardValidationService),
        validatedPuzzleGenerationService = validatedPuzzleGenerationService,
    )

    private val stitchingPreviewService = StitchingPreviewService(
        generationWorkflowService = generationWorkflowService,
        queensConstraintService = queensConstraintService,
    )

    @Test
    fun `buildPreview returns four quadrants and stitched board`() {
        val preview = stitchingPreviewService.buildPreview()

        assertEquals(7, preview.size)
        assertEquals(5, preview.orthogonalMinDistance)
        assertEquals(7, preview.topLeft.board.width)
        assertEquals(7, preview.topRight.board.width)
        assertEquals(7, preview.bottomLeft.board.height)
        assertEquals(7, preview.bottomRight.board.height)
        assertEquals(14, preview.stitchedBoard.width)
        assertEquals(14, preview.stitchedBoard.height)

        // Top-left targets 10 queens; dependent pieces each target 9
        assertEquals(10, preview.topLeft.targetQueenCount)
        assertEquals(9, preview.topRight.targetQueenCount)
        assertEquals(9, preview.bottomLeft.targetQueenCount)
        assertEquals(9, preview.bottomRight.targetQueenCount)

        // All quadrants must meet their targets
        assertTrue(preview.topLeft.queenCount >= preview.topLeft.targetQueenCount)
        assertTrue(preview.topRight.queenCount >= preview.topRight.targetQueenCount)
        assertTrue(preview.bottomLeft.queenCount >= preview.bottomLeft.targetQueenCount)
        assertTrue(preview.bottomRight.queenCount >= preview.bottomRight.targetQueenCount)
    }

    @Test
    fun `buildPreview applies requested blackout signatures to irregular boards`() {
        val preview = stitchingPreviewService.buildPreview()

        assertQuadrantMatchesSignatures(preview.topRight)
        assertQuadrantMatchesSignatures(preview.bottomLeft)
        assertQuadrantMatchesSignatures(preview.bottomRight)
    }

    @Test
    fun `buildPreview keeps active cells colored and blackout cells empty before stitch`() {
        val preview = stitchingPreviewService.buildPreview()

        listOf(preview.topLeft, preview.topRight, preview.bottomLeft, preview.bottomRight).forEach { quadrant ->
            quadrant.board.cells.flatten().forEach { cell ->
                if (cell.state == "blackout") {
                    assertEquals(null, cell.groupId)
                    assertEquals(null, cell.groupSlot)
                } else {
                    assertTrue(cell.groupId != null)
                    assertTrue(cell.groupSlot != null)
                }
            }
        }
    }

    @Test
    fun `buildPreview fills all blackout cells in stitched board`() {
        val preview = stitchingPreviewService.buildPreview()

        assertFalse(preview.stitchedBoard.cells.flatten().any { it.state == "blackout" })
        assertTrue(preview.stitchedBoard.cells.flatten().all { it.groupId != null && it.groupSlot != null })
    }

    private fun assertQuadrantMatchesSignatures(quadrant: StitchingPreviewQuadrantDto) {
        quadrant.board.cells.forEachIndexed { rowIndex, row ->
            val rowPrefix = quadrant.leftBlackoutSignature[rowIndex]
            row.forEachIndexed { colIndex, cell ->
                if (colIndex < rowPrefix) {
                    assertEquals("blackout", cell.state)
                }
            }
        }

        quadrant.topBlackoutSignature.forEachIndexed { colIndex, colPrefix ->
            quadrant.board.cells.forEachIndexed { rowIndex, row ->
                if (rowIndex < colPrefix) {
                    assertEquals("blackout", row[colIndex].state)
                }
            }
        }
    }
}
