package com.queens.admin.application

import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.CellState
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.model.QueensBoardMetadata
import com.queens.admin.domain.service.BlockedSquareExpansionService
import com.queens.admin.domain.service.BoardFactoryService
import com.queens.admin.domain.service.BoardValidationService
import com.queens.admin.domain.service.ColorExpansionService
import com.queens.admin.domain.service.DeterministicSolverSupportService
import com.queens.admin.domain.service.InitialColorAssignmentService
import com.queens.admin.domain.service.QueensConstraintService
import com.queens.admin.domain.service.QueenPlacementService
import com.queens.admin.domain.service.SolverEngine
import com.queens.admin.domain.service.SolverRuleRegistry
import com.queens.admin.domain.service.SolverPatternService
import com.queens.admin.domain.service.ValidatedPuzzleGenerationService
import com.queens.admin.domain.solver.rules.AxisIsolationForcedQueenRule
import com.queens.admin.domain.solver.rules.ConstrainedLinesRule
import com.queens.admin.domain.solver.rules.ConstrainedLineSetsRule
import com.queens.admin.domain.solver.rules.ConstrainedWindowRule
import com.queens.admin.domain.solver.rules.FlagAssumptionContradictionRule
import com.queens.admin.domain.solver.rules.FlagSquaresWithoutColorGroupsRule
import com.queens.admin.domain.solver.rules.ForcedCoverageQueenRule
import com.queens.admin.domain.solver.rules.GroupConfinedToLineRule
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.math.abs
import com.queens.admin.domain.solver.rules.PlaceLastFreeQueensRule
import com.queens.admin.domain.solver.rules.QueenAssumptionContradictionRule

class GenerationWorkflowServiceTest {
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
    private val solverWorkflowService = SolverWorkflowService(
        solverEngine = solverEngine,
        boardValidationService = boardValidationService,
        deterministicSolverSupportService = deterministicSolverSupportService,
        solverPatternService = solverPatternService,
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
    fun `generateValidBoard supports seven queens on 6x6 with orthogonal distance five`() {
        val result = generationWorkflowService.generateValidBoard(
            size = 6,
            targetQueenCount = 7,
            orthogonalMinDistance = 5,
            minimumGroupSize = 3,
            generationStrategy = "baseline",
        )

        assertTrue(result.success, "expected custom generation to succeed")
        val boardState = requireNotNull(result.boardState)
        assertEquals(6, boardState.size)
        assertEquals("7", boardState.metadata[QueensBoardMetadata.TARGET_QUEEN_COUNT_KEY])
        assertEquals("5", boardState.metadata[QueensBoardMetadata.ORTHOGONAL_MIN_DISTANCE_KEY])
        assertTrue(boardState.cells.flatten().all { it.groupColor != null }, "expected board to be fully colored")
        assertEquals(7, boardState.cells.flatten().count { it.markType == MarkType.QUEEN }, "expected seven queen marks")
        assertEquals(7, boardState.cells.flatten().count { it.isSolutionQueen }, "expected seven solution queens")
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
    fun `placeQueens respects custom orthogonal distance metadata`() {
        val customBoard = boardFactoryService.createEmptyBoard(
            size = 4,
            metadata = QueensBoardMetadata.metadata(
                boardSize = 4,
                targetQueenCount = 4,
                orthogonalMinDistance = 2,
            ),
        )
        val result = generationWorkflowService.placeQueens(customBoard)

        assertTrue(result.success, "expected queen placement to succeed with a smaller orthogonal distance")
        val boardState = requireNotNull(result.boardState)
        assertEquals(4, boardState.cells.flatten().count { it.isSolutionQueen })
        assertTrue(
            boardValidationService.validate(boardState).isValid,
            "expected placed queens to validate under the requested distance metadata",
        )
    }

    @Test
    fun `placeQueens can target seven queens on a 6x6 board`() {
        val customBoard = boardFactoryService.createEmptyBoard(
            size = 6,
            metadata = QueensBoardMetadata.metadata(
                boardSize = 6,
                targetQueenCount = 7,
                orthogonalMinDistance = 5,
            ),
        )
        val result = generationWorkflowService.placeQueens(customBoard)

        assertTrue(result.success, "expected 6x6 placement with 7 queens to succeed")
        val boardState = requireNotNull(result.boardState)
        assertEquals("7", boardState.metadata[QueensBoardMetadata.TARGET_QUEEN_COUNT_KEY])
        assertEquals("5", boardState.metadata[QueensBoardMetadata.ORTHOGONAL_MIN_DISTANCE_KEY])
        assertEquals(7, boardState.cells.flatten().count { it.isSolutionQueen })
        assertTrue(boardValidationService.validate(boardState).isValid)
    }

    @Test
    fun `single color workflow ignores groups that already have a queen`() {
        val boardState = BoardState(
            size = 4,
            metadata = QueensBoardMetadata.metadata(boardSize = 4),
            cells = List(4) { row ->
                List(4) { col ->
                    val position = Position(row, col)
                    val groupColor =
                        when (position) {
                            Position(0, 0), Position(0, 1) -> "A"
                            Position(2, 2), Position(2, 3) -> "B"
                            else -> null
                        }
                    val markType =
                        when (position) {
                            Position(0, 0) -> MarkType.QUEEN
                            Position(2, 3) -> MarkType.FLAG
                            else -> MarkType.NONE
                        }

                    CellState(
                        position = position,
                        groupColor = groupColor,
                        markType = markType,
                    )
                }
            },
        )

        val result = solverWorkflowService.runSingleColorGroupSolverRule(boardState)

        assertTrue(result.success)
        assertEquals("Placed a queen in color group B because it had one candidate left.", result.explanation)
        assertEquals(MarkType.QUEEN, requireNotNull(result.boardState).cells[2][2].markType)
    }

    @Test
    fun `deterministic analysis solves board immediately after initial colors for distance variant`() {
        val queenPositions = setOf(
            Position(0, 0),
            Position(0, 5),
            Position(2, 1),
            Position(3, 4),
            Position(4, 2),
            Position(5, 0),
            Position(5, 5),
        )
        val placedQueensBoard = boardFactoryService.createEmptyBoard(
            size = 6,
            metadata = QueensBoardMetadata.metadata(
                boardSize = 6,
                targetQueenCount = 7,
                orthogonalMinDistance = 5,
            ),
        ).copy(
            cells = List(6) { row ->
                List(6) { col ->
                    val isQueen = Position(row, col) in queenPositions
                    com.queens.admin.domain.model.CellState(
                        position = Position(row, col),
                        groupColor = null,
                        isSolutionQueen = isQueen,
                        markType = if (isQueen) MarkType.QUEEN else MarkType.NONE,
                    )
                }
            },
        )
        val initialColorsBoard = requireNotNull(generationWorkflowService.assignInitialColors(placedQueensBoard).boardState)

        val analysis = deterministicPuzzleAnalysisService.solve(
            deterministicPuzzleAnalysisService.withRuleset(
                boardState = initialColorsBoard,
                ruleset = QueensBoardMetadata.ruleset(initialColorsBoard),
                targetQueenCount = QueensBoardMetadata.targetQueenCount(initialColorsBoard),
            ),
        )

        val steps = analysis.solverResult.steps.joinToString(" -> ") { step ->
            "${step.ruleName}:${step.changedCells.size}"
        }
        println(
            "DETERMINISTIC_ANALYSIS_SUMMARY " +
                "solved=${analysis.solved} " +
                "stepsTaken=${analysis.stepsTaken} " +
                "hardestTier=${analysis.hardestTierUsed} " +
                "queensPlaced=${analysis.finalQueensPlaced} " +
                "unresolved=${analysis.unresolvedSquares} " +
                "steps=$steps",
        )
        if (!analysis.solved) {
            throw AssertionError(
                "Expected deterministic analysis to solve initial colors board. " +
                    "stepsTaken=${analysis.stepsTaken}, hardestTier=${analysis.hardestTierUsed}, " +
                    "queensPlaced=${analysis.finalQueensPlaced}, unresolved=${analysis.unresolvedSquares}, " +
                    "steps=$steps",
            )
        }
        assertEquals(7, analysis.finalQueensPlaced)
        assertEquals(0, analysis.unresolvedSquares)
    }

    private fun queenPositions(boardState: com.queens.admin.domain.model.BoardState): List<Position> =
        boardState.cells.flatten()
            .filter { it.isSolutionQueen }
            .map { it.position }
}
