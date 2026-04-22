package com.queens.admin.domain.service

import com.queens.admin.application.GenerationProgressUpdate
import com.queens.admin.application.GenerationMetricsSnapshot
import com.queens.admin.application.DeterministicPuzzleAnalysisService
import com.queens.admin.domain.model.ActionType
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.CellState
import com.queens.admin.domain.model.ChangedCell
import com.queens.admin.domain.model.GenerationPhase
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.OperationResult
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.model.QueensBoardMetadata
import com.queens.admin.domain.model.QueensRuleset
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.util.concurrent.CancellationException
import kotlin.math.abs
import kotlin.random.Random

@Service
class ValidatedPuzzleGenerationService(
    private val boardFactoryService: BoardFactoryService,
    private val boardValidationService: BoardValidationService,
    private val queensConstraintService: QueensConstraintService,
    private val deterministicPuzzleAnalysisService: DeterministicPuzzleAnalysisService,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(ValidatedPuzzleGenerationService::class.java)
        private const val BLACKOUT_ASSISTED_GROUP_SIZE_CAP = 3
    }

    private enum class GenerationStrategy {
        BASELINE,
        MARKER_GUIDED,
        TEMPLATE_SEEDED,
    }

    private fun GenerationStrategy.toApiValue(): String =
        when (this) {
            GenerationStrategy.BASELINE -> "baseline"
            GenerationStrategy.MARKER_GUIDED -> "marker-guided"
            GenerationStrategy.TEMPLATE_SEEDED -> "template-seeded"
        }

    private data class GenerationMetrics(
        var solverChecks: Int = 0,
        var rollbacks: Int = 0,
        var markerSquares: Int = 0,
        var markerBlocks: Int = 0,
        var markerGuidedCandidates: Int = 0,
        var markerGuidedPlacements: Int = 0,
        var fallbackPlacements: Int = 0,
        var successfulPlacements: Int = 0,
        var constrainedWindowHits: Int = 0,
        var constrainedWindowFlags: Int = 0,
        var deterministicSolved: Boolean? = null,
        var deterministicStepsTaken: Int = 0,
        var deterministicQueensPlaced: Int = 0,
        var deterministicUnresolvedSquares: Int = 0,
        var deterministicHardestTier: String? = null,
        var deterministicLastRule: String? = null,
    ) {
        fun toSnapshot(): GenerationMetricsSnapshot =
            GenerationMetricsSnapshot(
                solverChecks = solverChecks,
                rollbacks = rollbacks,
                markerSquares = markerSquares,
                markerBlocks = markerBlocks,
                markerGuidedCandidates = markerGuidedCandidates,
                markerGuidedPlacements = markerGuidedPlacements,
                fallbackPlacements = fallbackPlacements,
                successfulPlacements = successfulPlacements,
                constrainedWindowHits = constrainedWindowHits,
                constrainedWindowFlags = constrainedWindowFlags,
                deterministicSolved = deterministicSolved,
                deterministicStepsTaken = deterministicStepsTaken,
                deterministicQueensPlaced = deterministicQueensPlaced,
                deterministicUnresolvedSquares = deterministicUnresolvedSquares,
                deterministicHardestTier = deterministicHardestTier,
                deterministicLastRule = deterministicLastRule,
            )
    }

    private data class WindowConfinement(
        val rowRange: IntRange,
        val colRange: IntRange,
        val confinedColors: List<String>,
    )

    private data class ConstrainedWindowExpansionResult(
        val blockedSquares: List<Pair<Position, List<String>>>,
        val windowHits: Int,
        val blockedSquareCount: Int,
        val sampleWindowSummary: String? = null,
    )

    fun generateValidBoard(
        size: Int,
        targetQueenCount: Int = size,
        minimumGroupSize: Int = 3,
        generationStrategy: String = "baseline",
        seedTemplateOffsets: List<Position>? = null,
        blackoutPositions: Set<Position> = emptySet(),
        orthogonalMinDistance: Int = size,
        ruleset: QueensRuleset = QueensRuleset(
            orthogonalMinDistance = orthogonalMinDistance,
            forbidDiagonalTouch = true,
            requireRowCoverage = targetQueenCount == size && orthogonalMinDistance >= size,
            requireColumnCoverage = targetQueenCount == size && orthogonalMinDistance >= size,
        ),
        maxRetries: Int = 30_000,
        progressListener: ((GenerationProgressUpdate) -> Unit)? = null,
        isCancelled: (() -> Boolean)? = null,
    ): OperationResult {
        require(size in 4..20) { "Generation currently supports puzzle sizes 4 through 20." }
        require(targetQueenCount in 1..(size * size)) {
            "Target queen count must be between 1 and ${size * size}."
        }
        require(minimumGroupSize >= 1) { "Minimum group size must be at least 1." }
        require(minimumGroupSize <= size) {
            "Minimum group size cannot exceed the board size because there is one group per queen."
        }
        val strategy = parseGenerationStrategy(generationStrategy)
        logger.info(
            "Validated generation starting size={} targetQueenCount={} orthogonalMinDistance={} minimumGroupSize={} strategy={} maxRetries={}",
            size,
            targetQueenCount,
            ruleset.orthogonalMinDistance,
            minimumGroupSize,
            strategy.toApiValue(),
            maxRetries,
        )

        repeat(maxRetries) { attemptIndex ->
            ensureNotCancelled(isCancelled)
            val state = GeneratorState(
                grid = boardFactoryService.createEmptyBoard(
                    size = size,
                    metadata = QueensBoardMetadata.metadata(
                        boardSize = size,
                        targetQueenCount = targetQueenCount,
                        orthogonalMinDistance = ruleset.orthogonalMinDistance,
                        containsBlackedOutSquares = blackoutPositions.isNotEmpty(),
                    ),
                ).let { boardFactoryService.applyBlackouts(it, blackoutPositions) },
                autoTestMarks = createEmptyMarks(size),
                metrics = GenerationMetrics(),
                ruleset = ruleset,
                targetQueenCount = targetQueenCount,
            )
            val attemptNumber = attemptIndex + 1

            emitProgress(
                state = state,
                attempt = attemptNumber,
                stage = "ATTEMPT_START",
                message = "Starting generation attempt $attemptNumber.",
                strategy = strategy,
                progressListener = progressListener,
            )

            try {
                placeAllQueens(state, isCancelled)
                validateQueenCount(state.grid, targetQueenCount)
                emitProgress(
                    state,
                    attemptNumber,
                    "QUEENS_PLACED",
                    "Placed hidden queens.",
                    strategy,
                    progressListener,
                )

                assignInitialColorsToState(state)
                validateUniqueQueenColors(state.grid, targetQueenCount)
                emitProgress(
                    state,
                    attemptNumber,
                    "INITIAL_COLORS_ASSIGNED",
                    "Assigned unique seed colors to each queen.",
                    strategy,
                    progressListener,
                )
                if (!isSolvable(state)) {
                    error(
                        "Board is not fully solvable after initial colors " +
                            "(${lastDeterministicAnalysisSummary(state).toLogString()})",
                    )
                }

                if (strategy == GenerationStrategy.TEMPLATE_SEEDED) {
                    val seededGroups = applyTemplateSeeds(state, seedTemplateOffsets, isCancelled)
                    if (seededGroups <= 0) {
                        emitProgress(
                            state,
                            attemptNumber,
                            "RETRY_RESET",
                            "Template seeding could not place the requested seed shape on enough queen regions. Resetting and retrying.",
                            strategy,
                            progressListener,
                        )
                        return@repeat
                    }
                    emitProgress(
                        state,
                        attemptNumber,
                        "TEMPLATE_SEEDS_APPLIED",
                        "Seeded $seededGroups queen regions with the requested template before normal expansion.",
                        strategy,
                        progressListener,
                    )
                    if (!isSolvable(state)) {
                        error(
                            "Board is not fully solvable after template seeding " +
                                "(${lastDeterministicAnalysisSummary(state).toLogString()})",
                        )
                    }
                }

                for (targetGroupSize in 2..minimumGroupSize) {
                    val expansionSucceeded = expandColorGridSafely(
                        state = state,
                        attempt = attemptNumber,
                        targetGroupSize = targetGroupSize,
                        minimumGroupSize = minimumGroupSize,
                        stageName = "EXPANSION_TO_$targetGroupSize",
                        strategy = strategy,
                        progressListener = progressListener,
                        isCancelled = isCancelled,
                    )
                    val shortGroups = groupsBelowMinimum(state.grid, targetGroupSize)
                    if (!expansionSucceeded || shortGroups.isNotEmpty()) {
                        val failureMode =
                            if (!expansionSucceeded) {
                                "stalled expansion"
                            } else {
                                "post-expansion minimum-size validation"
                            }
                        val diagnostics = buildGroupExpansionDiagnostics(
                            boardState = state.grid,
                            targetGroupSize = targetGroupSize,
                            failedAttempts = emptySet(),
                        )
                        emitProgress(
                            state,
                            attemptNumber,
                            "RETRY_RESET",
                            "Expansion to size $targetGroupSize failed due to $failureMode. " +
                                "Short groups=${formatShortGroups(shortGroups)}. " +
                                "Reachability=${formatGroupDiagnostics(diagnostics)}. Resetting and retrying.",
                            strategy,
                            progressListener,
                        )
                        return@repeat
                    }
                    if (!isSolvable(state)) {
                        error(
                            "Board is not fully solvable after expansion to size $targetGroupSize " +
                                "(${lastDeterministicAnalysisSummary(state).toLogString()})",
                        )
                    }
                }

                expandIntoBlockedSquares(
                    state = state,
                    attempt = attemptNumber,
                    strategy = strategy,
                    progressListener = progressListener,
                    isCancelled = isCancelled,
                )
                val derivedBlackouts = applyDerivedStrandedBlackouts(state)
                if (derivedBlackouts.isNotEmpty()) {
                    emitProgress(
                        state,
                        attemptNumber,
                        "DERIVED_BLACKOUTS_APPLIED",
                        "Converted ${derivedBlackouts.size} stranded uncolored active cells into derived blackouts " +
                            "(fingerprint/signature unchanged): ${formatPositions(derivedBlackouts)}.",
                        strategy,
                        progressListener,
                    )
                }
                validateSolvableAndFull(state)
                emitProgress(
                    state,
                    attemptNumber,
                    "COMPLETED",
                    "Finished blocked-square expansion and validated a solvable full board.",
                    strategy,
                    progressListener,
                )

                val validation = boardValidationService.validate(state.grid, state.ruleset, state.targetQueenCount)
                return OperationResult(
                    success = true,
                    actionType = ActionType.GENERATE_VALID_BOARD,
                    explanation = "Generated a solvable board for size $size with $targetQueenCount queens, orthogonal distance ${ruleset.orthogonalMinDistance}, and minimum region size $minimumGroupSize using the validated generation workflow.",
                    boardState = state.grid.copy(generationPhase = GenerationPhase.BLOCKED_SQUARES_EXPANDED),
                    changedCells = state.grid.cells.flatMap { row ->
                        row.map { cell ->
                            ChangedCell(
                                row = cell.position.row,
                                col = cell.position.col,
                                changeType = "GENERATED",
                                explanation = "generated board snapshot",
                            )
                        }
                    },
                    warnings = validation.warnings,
                    errors = validation.errors,
                    validation = validation,
                )
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (error: Throwable) {
                logger.warn(
                    "Validated generation attempt {} failed size={} targetQueenCount={} orthogonalMinDistance={} minimumGroupSize={} strategy={} reason={}",
                    attemptNumber,
                    size,
                    targetQueenCount,
                    ruleset.orthogonalMinDistance,
                    minimumGroupSize,
                    strategy.toApiValue(),
                    error.message ?: "unknown error",
                )
                // Retry with a fresh board, matching the TS generator's retry behavior.
                emitProgress(
                    state,
                    attemptNumber,
                    "RETRY_RESET",
                    buildString {
                        append("Attempt $attemptNumber failed")
                        error.message?.takeIf { it.isNotBlank() }?.let { message ->
                            append(": ")
                            append(message)
                        }
                        append(". Starting over from an empty board.")
                    },
                    strategy,
                    progressListener,
                )
            }
        }

        logger.warn(
            "Validated generation exhausted {} attempts size={} targetQueenCount={} orthogonalMinDistance={} minimumGroupSize={} strategy={}",
            maxRetries,
            size,
            targetQueenCount,
            ruleset.orthogonalMinDistance,
            minimumGroupSize,
            strategy.toApiValue(),
        )

        val emptyBoard = boardFactoryService.createEmptyBoard(
            size = size,
            metadata = QueensBoardMetadata.metadata(
                boardSize = size,
                targetQueenCount = targetQueenCount,
                orthogonalMinDistance = ruleset.orthogonalMinDistance,
            ),
        )
        val validation = boardValidationService.validate(emptyBoard, ruleset, targetQueenCount)
        return OperationResult(
            success = false,
            actionType = ActionType.GENERATE_VALID_BOARD,
            explanation = "Failed to generate a solvable board after $maxRetries attempts.",
            boardState = emptyBoard,
            errors = validation.errors + "Failed to generate a solvable board after $maxRetries attempts.",
            warnings = validation.warnings,
            validation = validation,
        )
    }

    fun isBoardSolvable(
        boardState: BoardState,
        ruleset: QueensRuleset = QueensBoardMetadata.ruleset(boardState),
    ): Boolean {
        return isSolvable(
            GeneratorState(
                grid = boardState,
                autoTestMarks = createEmptyMarks(boardState.size),
                metrics = GenerationMetrics(),
                ruleset = ruleset,
                targetQueenCount = QueensBoardMetadata.targetQueenCount(boardState),
            ),
        )
    }

    private data class GeneratorState(
        var grid: BoardState,
        var autoTestMarks: MutableList<MutableList<MarkType>>,
        val metrics: GenerationMetrics,
        val ruleset: QueensRuleset,
        val targetQueenCount: Int,
    )

    private data class DeterministicAnalysisSummary(
        val solved: Boolean,
        val stepsTaken: Int,
        val queensPlaced: Int,
        val unresolvedSquares: Int,
        val hardestTier: String?,
        val lastRule: String?,
    ) {
        fun toLogString(): String =
            "deterministicSolved=$solved, " +
                "stepsTaken=$stepsTaken, " +
                "queensPlaced=$queensPlaced, " +
                "unresolvedSquares=$unresolvedSquares, " +
                "hardestTier=${hardestTier ?: "none"}, " +
                "lastRule=${lastRule ?: "none"}"
    }

    private data class GroupExpansionDiagnostics(
        val color: String,
        val currentSize: Int,
        val needed: Int,
        val nonBlackoutReachable: Int,
        val blackoutReachable: Int,
        val blockedByFailedAttempts: Int,
    ) {
        fun toLogString(): String =
            "$color:size=$currentSize,need=$needed,nonBlackoutReachable=$nonBlackoutReachable," +
                "blackoutReachable=$blackoutReachable,failedAttempts=$blockedByFailedAttempts"
    }

    private fun buildRegionIds(count: Int): List<String> =
        (1..count).map { index -> "g${index.toString().padStart(2, '0')}" }

    private fun ensureNotCancelled(isCancelled: (() -> Boolean)?) {
        if (isCancelled?.invoke() == true) {
            throw CancellationException("Generation cancelled")
        }
    }

    private fun emitProgress(
        state: GeneratorState,
        attempt: Int,
        stage: String,
        message: String,
        strategy: GenerationStrategy,
        progressListener: ((GenerationProgressUpdate) -> Unit)?,
    ) {
        if (stage == "RETRY_RESET" || stage == "COMPLETED" || attempt <= 3 || attempt % 100 == 0) {
            logger.info(
                "Validated generation progress attempt={} stage={} strategy={} colored={}/{} message={}",
                attempt,
                stage,
                strategy.toApiValue(),
                state.grid.cells.flatten().count { cell -> cell.groupColor != null },
                state.grid.size * state.grid.size,
                message,
            )
        }
        progressListener?.invoke(
            GenerationProgressUpdate(
                attempt = attempt,
                stage = stage,
                message = message,
                coloredCellCount = state.grid.cells.flatten().count { cell -> cell.groupColor != null },
                totalCellCount = state.grid.size * state.grid.size,
                strategy = strategy.toApiValue(),
                metrics = state.metrics.toSnapshot(),
                generationPhase = state.grid.generationPhase?.name,
                boardState = state.grid,
            ),
        )
    }

    private fun parseGenerationStrategy(generationStrategy: String): GenerationStrategy =
        when (generationStrategy.trim().uppercase().replace('-', '_')) {
            "MARKER_GUIDED" -> GenerationStrategy.MARKER_GUIDED
            "TEMPLATE_SEEDED" -> GenerationStrategy.TEMPLATE_SEEDED
            else -> GenerationStrategy.BASELINE
        }

    private fun createEmptyMarks(size: Int): MutableList<MutableList<MarkType>> {
        return MutableList(size) { MutableList(size) { MarkType.NONE } }
    }

    private fun cloneBoard(boardState: BoardState): BoardState {
        return boardState.copy(
            cells = boardState.cells.map { row ->
                row.map { cell ->
                    cell.copy(
                        position = Position(cell.position.row, cell.position.col),
                    )
                }
            },
        )
    }

    private fun isValidMoveWithMarks(
        row: Int,
        col: Int,
        marks: List<List<MarkType>>,
        boardState: BoardState,
        ruleset: QueensRuleset,
    ): Boolean {
        if (boardState.cells[row][col].isBlackout) return false
        val placedQueens = mutableListOf<Position>()
        for (candidateRow in marks.indices) {
            for (candidateCol in marks[candidateRow].indices) {
                if (marks[candidateRow][candidateCol] == MarkType.QUEEN &&
                    (candidateRow != row || candidateCol != col)
                ) {
                    placedQueens += Position(candidateRow, candidateCol)
                }
            }
        }

        if (!queensConstraintService.isValidPlacement(Position(row, col), placedQueens, ruleset)) {
            return false
        }

        val square = boardState.cells[row][col]
        val squareColor = square.groupColor ?: return true
        for (candidateRow in 0 until boardState.size) {
            for (candidateCol in 0 until boardState.size) {
                if (marks[candidateRow][candidateCol] == MarkType.QUEEN &&
                    boardState.cells[candidateRow][candidateCol].groupColor == squareColor
                ) {
                    return false
                }
            }
        }

        return true
    }

    private fun placeAllQueens(state: GeneratorState, isCancelled: (() -> Boolean)?) {
        val size = state.grid.size
        val tempQueenMarks = createEmptyMarks(size)

        var attempts = 0
        val maxAttempts = 100
        var consecutiveFailures = 0
        val maxConsecutiveFailures = 5

        while (countQueens(tempQueenMarks) < state.targetQueenCount && attempts < maxAttempts) {
            ensureNotCancelled(isCancelled)
            attempts += 1
            val success = placeRandomQueens(
                tempQueenMarks = tempQueenMarks,
                boardState = state.grid,
                size = size,
                targetQueenCount = state.targetQueenCount,
                ruleset = state.ruleset,
                isCancelled = isCancelled,
            )
            if (!success) {
                consecutiveFailures += 1
                if (consecutiveFailures >= maxConsecutiveFailures) {
                    clearMarks(tempQueenMarks)
                    consecutiveFailures = 0
                }
            } else {
                consecutiveFailures = 0
            }
        }

        val finalCells = state.grid.cells.mapIndexed { rowIndex, row ->
            row.mapIndexed { colIndex, cell ->
                val isQueen = tempQueenMarks[rowIndex][colIndex] == MarkType.QUEEN
                cell.copy(
                    isSolutionQueen = isQueen,
                    markType = when {
                        isQueen -> MarkType.QUEEN
                        cell.isBlackout -> MarkType.FLAG
                        else -> MarkType.NONE
                    },
                )
            }
        }
        state.grid = state.grid.copy(cells = finalCells, generationPhase = GenerationPhase.QUEENS_PLACED)

        if (countSolutionQueens(state.grid) != state.targetQueenCount) {
            error("Failed to place all ${state.targetQueenCount} queens")
        }
    }

    private fun placeRandomQueens(
        tempQueenMarks: MutableList<MutableList<MarkType>>,
        boardState: BoardState,
        size: Int,
        targetQueenCount: Int,
        ruleset: QueensRuleset,
        isCancelled: (() -> Boolean)?,
    ): Boolean {
        val random = Random.Default
        clearMarks(tempQueenMarks)
        var attempts = 0
        val maxAttempts = 1000

        fun getValidMoves(preferKnight: Boolean): MutableList<Position> {
            val allQueens = mutableListOf<Position>()
            for (row in 0 until size) {
                for (col in 0 until size) {
                    if (tempQueenMarks[row][col] == MarkType.QUEEN) {
                        allQueens += Position(row, col)
                    }
                }
            }
            val lastQueen = allQueens.lastOrNull()
            val moves = mutableListOf<Position>()
            val knightMoves = mutableListOf<Position>()

            for (row in 0 until size) {
                for (col in 0 until size) {
                    if (boardState.cells[row][col].isBlackout) continue
                    if (tempQueenMarks[row][col] == MarkType.NONE &&
                        isValidMoveWithMarks(row, col, tempQueenMarks, boardState, ruleset)
                    ) {
                        val position = Position(row, col)
                        moves += position
                        if (lastQueen != null) {
                            val deltaRow = abs(row - lastQueen.row)
                            val deltaCol = abs(col - lastQueen.col)
                            if ((deltaRow == 2 && deltaCol == 1) || (deltaRow == 1 && deltaCol == 2)) {
                                knightMoves += position
                            }
                        }
                    }
                }
            }

            val result = if (preferKnight && knightMoves.isNotEmpty()) knightMoves else moves
            result.shuffle(random)
            return result
        }

        fun cloneMarks(marks: MutableList<MutableList<MarkType>>): MutableList<MutableList<MarkType>> {
            return marks.map { row -> row.toMutableList() }.toMutableList()
        }

        fun backtrack(queensPlaced: Int): Boolean {
            ensureNotCancelled(isCancelled)
            if (queensPlaced == targetQueenCount) return true
            attempts += 1
            if (attempts > maxAttempts) return false

            val moves = getValidMoves(preferKnight = true)
            if (moves.isEmpty()) return false

            for (move in moves) {
                val previousMarks = cloneMarks(tempQueenMarks)
                tempQueenMarks[move.row][move.col] = MarkType.QUEEN
                if (backtrack(queensPlaced + 1)) {
                    return true
                }
                restoreMarks(tempQueenMarks, previousMarks)
            }
            return false
        }

        return backtrack(0)
    }

    private fun assignInitialColorsToState(state: GeneratorState) {
        val queenPositions = mutableListOf<Position>()
        for (row in 0 until state.grid.size) {
            for (col in 0 until state.grid.size) {
                if (state.grid.cells[row][col].isSolutionQueen) {
                    queenPositions += Position(row, col)
                }
            }
        }

        val regionIds = buildRegionIds(queenPositions.size).toMutableList()
        val updatedCells = state.grid.cells.mapIndexed { rowIndex, row ->
            row.mapIndexed { colIndex, cell ->
                if (cell.isSolutionQueen) {
                    cell.copy(groupColor = regionIds.removeFirst())
                } else {
                    cell.copy(groupColor = null)
                }
            }
        }

        state.grid = state.grid.copy(
            cells = updatedCells,
            generationPhase = GenerationPhase.INITIAL_COLORS_ASSIGNED,
        )
    }

    private data class SeedableQueenRegion(
        val position: Position,
        val regionId: String,
    )

    private fun applyTemplateSeeds(
        state: GeneratorState,
        seedTemplateOffsets: List<Position>?,
        isCancelled: (() -> Boolean)?,
    ): Int {
        val minimumSeedCount = ((state.grid.size + 1) / 2).coerceAtLeast(1)
        val seedableQueens = state.grid.cells.flatten()
            .filter { cell -> cell.isSolutionQueen && cell.groupColor != null }
            .map { cell -> SeedableQueenRegion(cell.position, cell.groupColor!!) }
            .shuffled(Random.Default)
        val cells = state.grid.cells.map { row -> row.toMutableList() }.toMutableList()
        var seededCount = 0

        val templateVariants = buildSeedTemplateVariants(seedTemplateOffsets)

        for (queenRegion in seedableQueens) {
            ensureNotCancelled(isCancelled)

            val matchingVariant = templateVariants
                .shuffled(Random.Default)
                .firstOrNull { offsets ->
                    findSeedTemplateOrigin(
                        cells = cells,
                        queenPosition = queenRegion.position,
                        regionId = queenRegion.regionId,
                        offsets = offsets,
                    ) != null
                } ?: continue

            val origin = findSeedTemplateOrigin(
                cells = cells,
                queenPosition = queenRegion.position,
                regionId = queenRegion.regionId,
                offsets = matchingVariant,
            ) ?: continue

            applySeedTemplate(
                cells = cells,
                origin = origin,
                queenPosition = queenRegion.position,
                regionId = queenRegion.regionId,
                offsets = matchingVariant,
            )
            seededCount += 1
        }

        if (seededCount < minimumSeedCount) {
            return 0
        }

        state.grid = state.grid.copy(
            cells = cells.map { row -> row.toList() },
            generationPhase = GenerationPhase.TEMPLATE_SEEDS_APPLIED,
        )
        return seededCount
    }

    private fun buildCornerTriominoVariants(): List<List<Position>> =
        rotateTemplateVariants(listOf(Position(0, 0), Position(1, 0), Position(0, 1)))

    private fun buildSeedTemplateVariants(seedTemplateOffsets: List<Position>?): List<List<Position>> {
        val sanitizedTemplate = sanitizeSeedTemplate(seedTemplateOffsets) ?: return buildCornerTriominoVariants()
        return rotateTemplateVariants(sanitizedTemplate)
    }

    private fun sanitizeSeedTemplate(seedTemplateOffsets: List<Position>?): List<Position>? {
        if (seedTemplateOffsets.isNullOrEmpty()) return null
        val uniqueOffsets = seedTemplateOffsets
            .distinctBy { "${it.row}:${it.col}" }
        val minRow = uniqueOffsets.minOf { it.row }
        val minCol = uniqueOffsets.minOf { it.col }
        return uniqueOffsets
            .map { offset -> Position(offset.row - minRow, offset.col - minCol) }
            .sortedWith(compareBy<Position> { it.row }.thenBy { it.col })
    }

    private fun rotateTemplateVariants(offsets: List<Position>): List<List<Position>> {
        val variants = linkedMapOf<String, List<Position>>()
        var current = offsets

        repeat(4) {
            val minRow = current.minOf { it.row }
            val minCol = current.minOf { it.col }
            val normalized = current
                .distinctBy { "${it.row}:${it.col}" }
                .map { offset -> Position(offset.row - minRow, offset.col - minCol) }
                .sortedWith(compareBy<Position> { it.row }.thenBy { it.col })
            val key = normalized.joinToString("|") { "${it.row},${it.col}" }
            variants[key] = normalized
            current = current.map { offset -> Position(offset.col, -offset.row) }
        }

        return variants.values.toList()
    }

    private fun findSeedTemplateOrigin(
        cells: List<List<CellState>>,
        queenPosition: Position,
        regionId: String,
        offsets: List<Position>,
    ): Position? {
        for (queenOffset in offsets) {
            val origin = Position(
                queenPosition.row - queenOffset.row,
                queenPosition.col - queenOffset.col,
            )
            var valid = true

            for (offset in offsets) {
                val row = origin.row + offset.row
                val col = origin.col + offset.col
                if (row !in cells.indices || col !in cells[row].indices) {
                    valid = false
                    break
                }

                val cell = cells[row][col]
                val isQueenCell = row == queenPosition.row && col == queenPosition.col
                if (isQueenCell) {
                    if (!cell.isSolutionQueen || cell.groupColor != regionId) {
                        valid = false
                        break
                    }
                    continue
                }

                if (cell.isSolutionQueen || cell.groupColor != null) {
                    valid = false
                    break
                }
            }

            if (valid) {
                return origin
            }
        }

        return null
    }

    private fun applySeedTemplate(
        cells: MutableList<MutableList<CellState>>,
        origin: Position,
        queenPosition: Position,
        regionId: String,
        offsets: List<Position>,
    ) {
        for (offset in offsets) {
            val row = origin.row + offset.row
            val col = origin.col + offset.col
            if (row == queenPosition.row && col == queenPosition.col) continue
            cells[row][col] = cells[row][col].copy(groupColor = regionId)
        }
    }

    private fun expandColorGridSafely(
        state: GeneratorState,
        attempt: Int,
        targetGroupSize: Int,
        minimumGroupSize: Int,
        stageName: String,
        strategy: GenerationStrategy,
        progressListener: ((GenerationProgressUpdate) -> Unit)?,
        isCancelled: (() -> Boolean)?,
    ): Boolean {
        val failedAttempts = mutableSetOf<String>()
        var acceptedPlacements = 0

        while (true) {
            ensureNotCancelled(isCancelled)
            val countsByColor = countCellsByColor(state.grid)
            val incompleteColors = countsByColor
                .filterValues { count -> count < targetGroupSize }
                .keys
            if (incompleteColors.isEmpty()) {
                emitProgress(
                    state,
                    attempt,
                    "${stageName}_SUMMARY",
                    "Reached target group size $targetGroupSize with $acceptedPlacements accepted expansions.",
                    strategy,
                    progressListener,
                )
                return true
            }

            val nonBlackoutCandidates = collectTargetGroupExpansionCandidates(
                boardState = state.grid,
                incompleteColors = incompleteColors,
                failedAttempts = failedAttempts,
            )
            val allowBlackoutFallback = targetGroupSize == minimumGroupSize
            val blackoutFallbackCandidates =
                if (allowBlackoutFallback && nonBlackoutCandidates.isEmpty()) {
                    collectTargetGroupExpansionCandidates(
                        boardState = state.grid,
                        incompleteColors = incompleteColors,
                        failedAttempts = failedAttempts,
                        countsByColor = countsByColor,
                        blackoutGrowthCap = targetGroupSize,
                        allowBlackoutTargets = true,
                    )
                } else {
                    emptyList()
                }
            val candidates =
                if (nonBlackoutCandidates.isNotEmpty()) {
                    nonBlackoutCandidates
                } else {
                    blackoutFallbackCandidates
                }
            if (nonBlackoutCandidates.isEmpty() && blackoutFallbackCandidates.isNotEmpty()) {
                emitProgress(
                    state,
                    attempt,
                    "${stageName}_BLACKOUT_FALLBACK",
                    "No non-blackout group-expansion candidates remained; trying ${blackoutFallbackCandidates.size} blackout-inclusive candidates " +
                        "(blackout-assisted growth capped at size $targetGroupSize, only allowed at minimum-group stage) " +
                        "to reach target size $targetGroupSize.",
                    strategy,
                    progressListener,
                )
            }
            if (candidates.isEmpty()) {
                val diagnostics = buildGroupExpansionDiagnostics(
                    boardState = state.grid,
                    targetGroupSize = targetGroupSize,
                    failedAttempts = failedAttempts,
                )
                emitProgress(
                    state,
                    attempt,
                    "${stageName}_STALLED",
                    "No legal group-expansion candidates remained for target size $targetGroupSize. " +
                        "Diagnostics=${formatGroupDiagnostics(diagnostics)}.",
                    strategy,
                    progressListener,
                )
                return false
            }

            var accepted = false
            for ((index, candidate) in candidates.shuffled(Random.Default).withIndex()) {
                val originalColor = state.grid.cells[candidate.position.row][candidate.position.col].groupColor
                state.grid = paintCell(state.grid, candidate.position, candidate.neighborColor)
                emitProgress(
                    state,
                    attempt,
                    stageName,
                    "Tried expansion candidate ${index + 1}/${candidates.size} at (${candidate.position.row}, ${candidate.position.col}) with ${candidate.neighborColor} toward size $targetGroupSize.",
                    strategy,
                    progressListener,
                )
                if (isSolvable(state)) {
                    acceptedPlacements += 1
                    state.metrics.successfulPlacements += 1
                    emitProgress(
                        state,
                        attempt,
                        "${stageName}_ACCEPTED",
                        "Accepted expansion at (${candidate.position.row}, ${candidate.position.col}) with ${candidate.neighborColor} because ${lastDeterministicAnalysisSummary(state).toLogString()}.",
                        strategy,
                        progressListener,
                    )
                    accepted = true
                    break
                }

                failedAttempts += candidate.attemptKey
                state.metrics.rollbacks += 1
                state.grid = paintCell(state.grid, candidate.position, originalColor)
                emitProgress(
                    state,
                    attempt,
                    "${stageName}_ROLLBACK",
                    "Rolled back expansion at (${candidate.position.row}, ${candidate.position.col}) with ${candidate.neighborColor} because ${lastDeterministicAnalysisSummary(state).toLogString()}.",
                    strategy,
                    progressListener,
                )
            }

            if (!accepted) {
                return false
            }
        }
    }

    private fun clearAutoTestMarks(state: GeneratorState) {
        clearMarks(state.autoTestMarks)
        flagSquaresWithoutColorGroups(state)
    }

    private fun clearMarks(marks: MutableList<MutableList<MarkType>>) {
        for (row in marks.indices) {
            for (col in marks[row].indices) {
                marks[row][col] = MarkType.NONE
            }
        }
    }

    private fun restoreMarks(
        target: MutableList<MutableList<MarkType>>,
        source: MutableList<MutableList<MarkType>>,
    ) {
        for (row in target.indices) {
            for (col in target[row].indices) {
                target[row][col] = source[row][col]
            }
        }
    }

    private fun countQueens(marks: List<List<MarkType>>): Int {
        return marks.sumOf { row -> row.count { mark -> mark == MarkType.QUEEN } }
    }

    private fun countSolutionQueens(boardState: BoardState): Int {
        return boardState.cells.sumOf { row -> row.count { cell -> cell.isSolutionQueen } }
    }

    private fun validateQueenCount(boardState: BoardState, expectedCount: Int) {
        if (countSolutionQueens(boardState) != expectedCount) {
            error("Expected $expectedCount queens")
        }
    }

    private fun validateUniqueQueenColors(boardState: BoardState, expectedCount: Int) {
        val colors = boardState.cells.flatten()
            .filter { cell -> cell.isSolutionQueen }
            .mapNotNull { cell -> cell.groupColor }
            .toSet()
        if (colors.size != expectedCount) {
            error("Expected $expectedCount unique queen colors, got ${colors.size}")
        }
    }

    private fun isSolvable(state: GeneratorState): Boolean {
        state.metrics.solverChecks += 1
        val analysis = deterministicPuzzleAnalysisService.assessDifficulty(
            boardState = deterministicPuzzleAnalysisService.withRuleset(
                boardState = state.grid,
                ruleset = state.ruleset,
                targetQueenCount = state.targetQueenCount,
            ),
        )
        updateDeterministicMetrics(state, analysis)
        return analysis.solved && analysis.difficultyTier != com.queens.admin.domain.model.PuzzleDifficultyTier.UNSOLVABLE
    }

    private fun updateDeterministicMetrics(
        state: GeneratorState,
        analysis: DeterministicPuzzleAnalysisService.AnalysisResult,
    ) {
        state.metrics.deterministicSolved = analysis.solved
        state.metrics.deterministicStepsTaken = analysis.stepsTaken
        state.metrics.deterministicQueensPlaced = analysis.finalQueensPlaced
        state.metrics.deterministicUnresolvedSquares = analysis.unresolvedSquares
        state.metrics.deterministicHardestTier = analysis.hardestTierUsed?.name?.lowercase()?.replace('_', '-')
        state.metrics.deterministicLastRule = analysis.solverResult.steps.lastOrNull()?.ruleName
    }

    private fun lastDeterministicAnalysisSummary(state: GeneratorState): DeterministicAnalysisSummary =
        DeterministicAnalysisSummary(
            solved = state.metrics.deterministicSolved == true,
            stepsTaken = state.metrics.deterministicStepsTaken,
            queensPlaced = state.metrics.deterministicQueensPlaced,
            unresolvedSquares = state.metrics.deterministicUnresolvedSquares,
            hardestTier = state.metrics.deterministicHardestTier,
            lastRule = state.metrics.deterministicLastRule,
        )

    private fun countCellsByColor(boardState: BoardState): Map<String, Int> {
        val counts = linkedMapOf<String, Int>()
        for (cell in boardState.cells.flatten()) {
            val color = cell.groupColor ?: continue
            counts[color] = (counts[color] ?: 0) + 1
        }
        return counts
    }

    private fun groupsBelowMinimum(boardState: BoardState, expectedSize: Int): Map<String, Int> {
        val counts = countCellsByColor(boardState)
        return counts.filterValues { count -> count < expectedSize }
    }

    private fun buildGroupExpansionDiagnostics(
        boardState: BoardState,
        targetGroupSize: Int,
        failedAttempts: Set<String>,
    ): List<GroupExpansionDiagnostics> {
        val countsByColor = countCellsByColor(boardState)
        val incompleteColors = countsByColor
            .filterValues { count -> count < targetGroupSize }
            .keys
            .sorted()
        val diagnostics = mutableListOf<GroupExpansionDiagnostics>()
        for (color in incompleteColors) {
            val nonBlackoutTargets = linkedSetOf<String>()
            val blackoutTargets = linkedSetOf<String>()
            val directions = listOf(0 to -1, 0 to 1, -1 to 0, 1 to 0)
            for (row in 0 until boardState.size) {
                for (col in 0 until boardState.size) {
                    if (boardState.cells[row][col].groupColor != color) continue
                    for ((deltaRow, deltaCol) in directions) {
                        val targetRow = row + deltaRow
                        val targetCol = col + deltaCol
                        if (targetRow !in 0 until boardState.size || targetCol !in 0 until boardState.size) continue
                        val targetCell = boardState.cells[targetRow][targetCol]
                        if (targetCell.groupColor != null) continue
                        if (targetCell.isBlackout) {
                            blackoutTargets += "$targetRow,$targetCol"
                        } else {
                            nonBlackoutTargets += "$targetRow,$targetCol"
                        }
                    }
                }
            }

            val blockedByFailedAttempts =
                (nonBlackoutTargets + blackoutTargets).count { target ->
                    "$target,$color" in failedAttempts
                }
            val size = countsByColor[color] ?: 0
            diagnostics += GroupExpansionDiagnostics(
                color = color,
                currentSize = size,
                needed = targetGroupSize - size,
                nonBlackoutReachable = nonBlackoutTargets.size,
                blackoutReachable = blackoutTargets.size,
                blockedByFailedAttempts = blockedByFailedAttempts,
            )
        }
        return diagnostics
    }

    private fun formatShortGroups(shortGroups: Map<String, Int>): String {
        if (shortGroups.isEmpty()) return "none"
        return shortGroups.entries
            .sortedBy { it.key }
            .joinToString("; ") { (color, size) -> "$color:size=$size" }
    }

    private fun formatGroupDiagnostics(diagnostics: List<GroupExpansionDiagnostics>): String {
        if (diagnostics.isEmpty()) return "none"
        return diagnostics.joinToString("; ") { diagnostic -> diagnostic.toLogString() }
    }

    private fun applyDerivedStrandedBlackouts(state: GeneratorState): List<Position> {
        val derived = mutableListOf<Position>()
        var changed = true
        val directions = listOf(0 to -1, 0 to 1, -1 to 0, 1 to 0)

        while (changed) {
            changed = false
            val toBlackout = mutableListOf<Position>()
            for (row in 0 until state.grid.size) {
                for (col in 0 until state.grid.size) {
                    val cell = state.grid.cells[row][col]
                    if (cell.isBlackout || cell.groupColor != null) continue
                    val stranded = directions.all { (deltaRow, deltaCol) ->
                        val nr = row + deltaRow
                        val nc = col + deltaCol
                        if (nr !in 0 until state.grid.size || nc !in 0 until state.grid.size) {
                            true
                        } else {
                            state.grid.cells[nr][nc].isBlackout
                        }
                    }
                    if (stranded) {
                        toBlackout += Position(row, col)
                    }
                }
            }

            if (toBlackout.isNotEmpty()) {
                changed = true
                val blackoutSet = toBlackout.toSet()
                state.grid = state.grid.copy(
                    cells = state.grid.cells.map { row ->
                        row.map { cell ->
                            if (cell.position in blackoutSet) {
                                cell.copy(isBlackout = true)
                            } else {
                                cell
                            }
                        }
                    },
                )
                derived += toBlackout
            }
        }

        return derived
            .distinct()
            .sortedWith(compareBy<Position>({ it.row }, { it.col }))
    }

    private fun formatPositions(positions: List<Position>): String {
        if (positions.isEmpty()) return "none"
        val shown = positions.take(12)
        val summary = shown.joinToString(", ") { position -> "(${position.row},${position.col})" }
        return if (shown.size < positions.size) "$summary, ... (+${positions.size - shown.size} more)" else summary
    }

    private fun collectTargetGroupExpansionCandidates(
        boardState: BoardState,
        incompleteColors: Set<String>,
        failedAttempts: Set<String>,
        countsByColor: Map<String, Int> = countCellsByColor(boardState),
        blackoutGrowthCap: Int = BLACKOUT_ASSISTED_GROUP_SIZE_CAP,
        allowBlackoutTargets: Boolean = false,
    ): List<ExpansionCandidate> {
        val candidates = mutableListOf<ExpansionCandidate>()
        val seen = linkedSetOf<String>()

        for (row in 0 until boardState.size) {
            for (col in 0 until boardState.size) {
                val color = boardState.cells[row][col].groupColor
                if (color == null || color !in incompleteColors) continue
                if (boardState.cells[row][col].isBlackout) continue

                val directions = listOf(0 to -1, 0 to 1, -1 to 0, 1 to 0)
                for ((deltaRow, deltaCol) in directions) {
                    val targetRow = row + deltaRow
                    val targetCol = col + deltaCol
                    if (targetRow !in 0 until boardState.size || targetCol !in 0 until boardState.size) continue
                    val targetCell = boardState.cells[targetRow][targetCol]
                    if (!allowBlackoutTargets && targetCell.isBlackout) continue
                    if (allowBlackoutTargets && targetCell.isBlackout) {
                        val sizeNow = countsByColor[color] ?: 0
                        if (sizeNow >= blackoutGrowthCap) continue
                    }
                    if (boardState.cells[targetRow][targetCol].groupColor != null) continue

                    val attemptKey = "$targetRow,$targetCol,$color"
                    if (attemptKey in failedAttempts || !seen.add(attemptKey)) continue
                    candidates += ExpansionCandidate(
                        position = Position(targetRow, targetCol),
                        neighborColor = color,
                        attemptKey = attemptKey,
                        markerGuided = false,
                    )
                }
            }
        }

        return candidates
    }

    private fun validateSolvableAndFull(state: GeneratorState) {
        val solvable = isSolvable(state)
        if (!solvable) {
            error(
                "Board is not fully solvable " +
                    "(colored=${state.grid.cells.flatten().count { it.groupColor != null && !it.isBlackout }}/${state.grid.cells.flatten().count { !it.isBlackout }}, " +
                    "targetQueens=${state.targetQueenCount}, " +
                    "orthogonalMinDistance=${state.ruleset.orthogonalMinDistance}, " +
                    "${lastDeterministicAnalysisSummary(state).toLogString()})",
            )
        }

        val validation = boardValidationService.validate(state.grid, state.ruleset, state.targetQueenCount)
        val allColored = state.grid.cells.all { row -> row.all { cell -> cell.isBlackout || cell.groupColor != null } }
        if (!validation.isValid || !allColored) {
            val validationErrors = if (validation.errors.isEmpty()) "none" else validation.errors.joinToString(" | ")
            error(
                "Board is not fully solvable and colored " +
                    "(allActiveColored=$allColored, " +
                    "validationValid=${validation.isValid}, " +
                    "colored=${state.grid.cells.flatten().count { it.groupColor != null }}/${state.grid.size * state.grid.size}, " +
                    "targetQueens=${state.targetQueenCount}, " +
                    "orthogonalMinDistance=${state.ruleset.orthogonalMinDistance}, " +
                    "requireRowCoverage=${state.ruleset.requireRowCoverage}, " +
                    "requireColumnCoverage=${state.ruleset.requireColumnCoverage}, " +
                    "validationErrors=$validationErrors)",
            )
        }
    }

    private fun excludedSquaresForQueenPlacement(
        boardState: BoardState,
        queenPosition: Position,
        ruleset: QueensRuleset,
    ): Set<Position> {
        val excluded = queensConstraintService.getExcludedSquares(
            boardSize = boardState.size,
            queenPosition = queenPosition,
            ruleset = ruleset,
        ).toMutableSet()
        val queenColor = boardState.cells[queenPosition.row][queenPosition.col].groupColor
        if (queenColor != null) {
            boardState.cells.flatten()
                .filter { cell ->
                    cell.groupColor == queenColor && cell.position != queenPosition
                }
                .mapTo(excluded) { cell -> cell.position }
        }
        return excluded
    }

    private fun placeQueen(state: GeneratorState, row: Int, col: Int) {
        if (!state.grid.cells[row][col].isSolutionQueen) {
            state.autoTestMarks[row][col] = MarkType.INVALID
            error("Attempted to place queen at ($row, $col) but it's not a solution queen")
        }

        state.autoTestMarks[row][col] = MarkType.QUEEN
        excludedSquaresForQueenPlacement(state.grid, Position(row, col), state.ruleset).forEach { position ->
            if (state.autoTestMarks[position.row][position.col] == MarkType.NONE) {
                placeFlag(state, position.row, position.col, "blocked by queen at ($row, $col)")
            }
        }
    }

    private fun placeFlag(state: GeneratorState, row: Int, col: Int, reason: String) {
        if (state.grid.cells[row][col].isSolutionQueen) {
            error("Attempted to flag solution queen at ($row, $col): $reason")
        }
        state.autoTestMarks[row][col] = MarkType.FLAG
    }

    private fun runAllSolverSteps(state: GeneratorState) {
        clearAutoTestMarks(state)
        var previousFlagCount = -1
        var currentFlagCount = countFlags(state.autoTestMarks)

        while (previousFlagCount != currentFlagCount) {
            previousFlagCount = currentFlagCount
            flagSquaresWithoutColorGroups(state)
            placeLastFreeQueens(state)
            flagBlockingSquares(state)
            placeLastFreeQueens(state)
            eliminateConstrainedRows(state)
            placeLastFreeQueens(state)
            eliminateConstrainedColumns(state)
            placeLastFreeQueens(state)
            currentFlagCount = countFlags(state.autoTestMarks)
        }
    }

    private fun countFlags(marks: List<List<MarkType>>): Int {
        return marks.sumOf { row -> row.count { mark -> mark == MarkType.FLAG } }
    }

    private fun flagSquaresWithoutColorGroups(state: GeneratorState) {
        for (row in 0 until state.grid.size) {
            for (col in 0 until state.grid.size) {
                val cell = state.grid.cells[row][col]
                if ((cell.groupColor == null || cell.isBlackout) && state.autoTestMarks[row][col] == MarkType.NONE) {
                    placeFlag(state, row, col, "square has no color group")
                }
            }
        }
    }

    private fun placeLastFreeQueens(state: GeneratorState) {
        val size = state.grid.size
        val colorGroups = linkedMapOf<String, MutableList<Position>>()
        for (row in 0 until size) {
            for (col in 0 until size) {
                val color = state.grid.cells[row][col].groupColor ?: continue
                colorGroups.getOrPut(color) { mutableListOf() }.add(Position(row, col))
            }
        }

        for (positions in colorGroups.values) {
            val unflagged = positions.filter { state.autoTestMarks[it.row][it.col] != MarkType.FLAG }
            if (unflagged.size == 1) {
                placeQueen(state, unflagged.single().row, unflagged.single().col)
            }
        }

        if (state.ruleset.requireRowCoverage) {
            for (row in 0 until size) {
                val unflagged = (0 until size).filter { col -> state.autoTestMarks[row][col] != MarkType.FLAG }
                if (unflagged.size == 1) {
                    placeQueen(state, row, unflagged.single())
                }
            }
        }

        if (state.ruleset.requireColumnCoverage) {
            for (col in 0 until size) {
                val unflagged = (0 until size).filter { row -> state.autoTestMarks[row][col] != MarkType.FLAG }
                if (unflagged.size == 1) {
                    placeQueen(state, unflagged.single(), col)
                }
            }
        }
    }

    private fun flagBlockingSquares(state: GeneratorState) {
        val size = state.grid.size
        for (row in 0 until size) {
            for (col in 0 until size) {
                if (state.autoTestMarks[row][col] != MarkType.NONE) continue
                val simulatedMarks = state.autoTestMarks.map { markRow -> markRow.toMutableList() }.toMutableList()
                simulatedMarks[row][col] = MarkType.QUEEN

                excludedSquaresForQueenPlacement(state.grid, Position(row, col), state.ruleset).forEach { position ->
                    if (simulatedMarks[position.row][position.col] == MarkType.NONE) {
                        simulatedMarks[position.row][position.col] = MarkType.FLAG
                    }
                }

                val rowFullyBlocked = state.ruleset.requireRowCoverage && (0 until size).any { candidateRow ->
                    simulatedMarks[candidateRow].all { mark -> mark == MarkType.FLAG }
                }
                val colFullyBlocked = state.ruleset.requireColumnCoverage && (0 until size).any { candidateCol ->
                    simulatedMarks.all { markRow -> markRow[candidateCol] == MarkType.FLAG }
                }

                val colorGroups = linkedMapOf<String, MutableList<Position>>()
                for (candidateRow in 0 until size) {
                    for (candidateCol in 0 until size) {
                        val color = state.grid.cells[candidateRow][candidateCol].groupColor ?: continue
                        colorGroups.getOrPut(color) { mutableListOf() }.add(Position(candidateRow, candidateCol))
                    }
                }

                val colorGroupBlocked = colorGroups.values.any { positions ->
                    positions.all { position -> simulatedMarks[position.row][position.col] == MarkType.FLAG }
                }

                if (rowFullyBlocked || colFullyBlocked || colorGroupBlocked) {
                    placeFlag(state, row, col, "row/column/color group blocked")
                }
            }
        }
    }

    private fun eliminateConstrainedRows(state: GeneratorState) {
        if (state.ruleset.requireRowCoverage && state.ruleset.orthogonalMinDistance >= state.grid.size) {
            eliminateClassicConstrainedLines(state, isColumn = false)
        } else {
            eliminateConstrainedWindows(state)
        }
    }

    private fun eliminateConstrainedColumns(state: GeneratorState) {
        if (state.ruleset.requireColumnCoverage && state.ruleset.orthogonalMinDistance >= state.grid.size) {
            eliminateClassicConstrainedLines(state, isColumn = true)
        }
    }

    private fun eliminateClassicConstrainedLines(state: GeneratorState, isColumn: Boolean) {
        val size = state.grid.size
        val colorToAxisMap = linkedMapOf<String, MutableSet<Int>>()

        for (row in 0 until size) {
            for (col in 0 until size) {
                val color = state.grid.cells[row][col].groupColor
                val mark = state.autoTestMarks[row][col]
                if (mark == MarkType.NONE && color != null) {
                    val coordinate = if (isColumn) col else row
                    colorToAxisMap.getOrPut(color) { linkedSetOf() }.add(coordinate)
                }
            }
        }

        val axisSetToColors = linkedMapOf<String, MutableSet<String>>()
        for ((color, axisSet) in colorToAxisMap) {
            val key = axisSet.sorted().joinToString(",")
            axisSetToColors.getOrPut(key) { linkedSetOf() }.add(color)
        }

        for ((axisKey, allowedColors) in axisSetToColors) {
            if (allowedColors.size < 2) continue
            val axisValues = axisKey.split(",").filter { it.isNotBlank() }.map { it.toInt() }
            if (axisValues.size != allowedColors.size) continue

            for (primaryIndex in axisValues) {
                for (secondaryIndex in 0 until size) {
                    val row = if (isColumn) secondaryIndex else primaryIndex
                    val col = if (isColumn) primaryIndex else secondaryIndex
                    val squareColor = state.grid.cells[row][col].groupColor
                    val isUnmarked = state.autoTestMarks[row][col] == MarkType.NONE
                    val isOutsideAllowedColors = squareColor == null || squareColor !in allowedColors
                    if (isUnmarked && isOutsideAllowedColors) {
                        placeFlag(state, row, col, "outside allowed colors")
                    }
                }
            }
        }
    }

    private fun eliminateConstrainedWindows(state: GeneratorState) {
        val size = state.grid.size
        val windowSize = state.ruleset.orthogonalMinDistance.coerceAtMost(size)
        if (windowSize <= 0) return

        val colorCandidates = linkedMapOf<String, MutableList<Position>>()

        for (row in 0 until size) {
            for (col in 0 until size) {
                if (state.autoTestMarks[row][col] != MarkType.NONE) continue
                val color = state.grid.cells[row][col].groupColor ?: continue
                colorCandidates.getOrPut(color) { mutableListOf() }.add(Position(row, col))
            }
        }

        for (rowStart in 0 until size) {
            val rowRange = rowStart until (rowStart + windowSize).coerceAtMost(size)
            for (colStart in 0 until size) {
                val colRange = colStart until (colStart + windowSize).coerceAtMost(size)
                val confinement = constrainedWindow(colorCandidates, rowRange, colRange) ?: continue
                var flaggedInWindow = 0

                for (row in rowRange) {
                    for (col in colRange) {
                        val squareColor = state.grid.cells[row][col].groupColor
                        val isUnmarked = state.autoTestMarks[row][col] == MarkType.NONE
                        val isOutsideAllowedColors =
                            squareColor == null || squareColor !in confinement.confinedColors
                        if (isUnmarked && isOutsideAllowedColors) {
                            placeFlag(state, row, col, "outside allowed colors in constrained window")
                            flaggedInWindow += 1
                        }
                    }
                }

                if (flaggedInWindow > 0) {
                    state.metrics.constrainedWindowHits += 1
                    state.metrics.constrainedWindowFlags += flaggedInWindow
                }
            }
        }
    }

    private fun eliminateConstrainedLinesForExpansion(
        boardState: BoardState,
        ruleset: QueensRuleset,
        isColumn: Boolean,
    ): List<Pair<Position, List<String>>> {
        return if ((isColumn && ruleset.requireColumnCoverage || !isColumn && ruleset.requireRowCoverage) &&
            ruleset.orthogonalMinDistance >= boardState.size
        ) {
            eliminateClassicConstrainedLinesForExpansion(boardState, ruleset, isColumn)
        } else {
            if (isColumn) emptyList() else eliminateConstrainedWindowsForExpansion(boardState, ruleset).blockedSquares
        }
    }

    private fun eliminateClassicConstrainedLinesForExpansion(
        boardState: BoardState,
        ruleset: QueensRuleset,
        isColumn: Boolean,
    ): List<Pair<Position, List<String>>> {
        val size = boardState.size
        val colorToAxisMap = linkedMapOf<String, MutableSet<Int>>()

        for (row in 0 until size) {
            for (col in 0 until size) {
                val color = boardState.cells[row][col].groupColor ?: continue
                val coordinate = if (isColumn) col else row
                colorToAxisMap.getOrPut(color) { linkedSetOf() }.add(coordinate)
            }
        }

        val axisSetToColors = linkedMapOf<String, MutableSet<String>>()
        for ((color, axisSet) in colorToAxisMap) {
            val key = axisSet.sorted().joinToString(",")
            axisSetToColors.getOrPut(key) { linkedSetOf() }.add(color)
        }

        val blockedSquares = mutableListOf<Pair<Position, List<String>>>()
        for ((axisKey, allowedColors) in axisSetToColors) {
            if (allowedColors.size < 2) continue
            val axisValues = axisKey.split(",").filter { it.isNotBlank() }.map { it.toInt() }
            for (primaryIndex in axisValues) {
                for (secondaryIndex in 0 until size) {
                    val row = if (isColumn) secondaryIndex else primaryIndex
                    val col = if (isColumn) primaryIndex else secondaryIndex
                    val squareColor = boardState.cells[row][col].groupColor
                    val isUnmarked = squareColor == null
                    val isOutsideAllowedColors = squareColor == null || squareColor !in allowedColors
                    if (isUnmarked && isOutsideAllowedColors) {
                        blockedSquares += Position(row, col) to allowedColors.toList()
                    }
                }
            }
        }

        return blockedSquares
    }

    private fun eliminateConstrainedWindowsForExpansion(
        boardState: BoardState,
        ruleset: QueensRuleset,
    ): ConstrainedWindowExpansionResult {
        val size = boardState.size
        val windowSize = ruleset.orthogonalMinDistance.coerceAtMost(size)
        if (windowSize <= 0) {
            return ConstrainedWindowExpansionResult(emptyList(), 0, 0, null)
        }

        val colorCandidates = linkedMapOf<String, MutableList<Position>>()

        for (row in 0 until size) {
            for (col in 0 until size) {
                val color = boardState.cells[row][col].groupColor ?: continue
                colorCandidates.getOrPut(color) { mutableListOf() }.add(Position(row, col))
            }
        }

        val blockedSquares = mutableListOf<Pair<Position, List<String>>>()
        var windowHits = 0
        var sampleWindowSummary: String? = null

        for (rowStart in 0 until size) {
            val rowRange = rowStart until (rowStart + windowSize).coerceAtMost(size)
            for (colStart in 0 until size) {
                val colRange = colStart until (colStart + windowSize).coerceAtMost(size)
                val confinement = constrainedWindow(colorCandidates, rowRange, colRange) ?: continue
                var blockedInWindow = 0

                for (row in rowRange) {
                    for (col in colRange) {
                        val squareColor = boardState.cells[row][col].groupColor
                        val isUnmarked = squareColor == null
                        val isOutsideAllowedColors =
                            squareColor == null || squareColor !in confinement.confinedColors
                        if (isUnmarked && isOutsideAllowedColors) {
                            blockedSquares += Position(row, col) to confinement.confinedColors
                            blockedInWindow += 1
                        }
                    }
                }

                if (blockedInWindow > 0) {
                    windowHits += 1
                    if (sampleWindowSummary == null) {
                        sampleWindowSummary =
                            "rows ${confinement.rowRange.first}-${confinement.rowRange.last}, " +
                                "cols ${confinement.colRange.first}-${confinement.colRange.last}, " +
                                "colors=${confinement.confinedColors.joinToString(",")}, blocked=$blockedInWindow"
                    }
                }
            }
        }

        return ConstrainedWindowExpansionResult(
            blockedSquares = blockedSquares,
            windowHits = windowHits,
            blockedSquareCount = blockedSquares.size,
            sampleWindowSummary = sampleWindowSummary,
        )
    }

    private fun constrainedWindow(
        colorCandidates: Map<String, List<Position>>,
        rowRange: IntRange,
        colRange: IntRange,
    ): WindowConfinement? {
        val windowCapacity = minOf(rowRange.count(), colRange.count())
        if (windowCapacity <= 0) return null

        val colorsTouchingWindow = linkedSetOf<String>()
        for ((color, positions) in colorCandidates) {
            if (positions.any { position -> position.row in rowRange && position.col in colRange }) {
                colorsTouchingWindow += color
            }
        }

        val confinedColors = colorsTouchingWindow.filter { color ->
            colorCandidates[color].orEmpty().all { position ->
                position.row in rowRange && position.col in colRange
            }
        }

        return if (confinedColors.size == windowCapacity) {
            WindowConfinement(rowRange, colRange, confinedColors)
        } else {
            null
        }
    }

    private fun expandIntoBlockedSquares(
        state: GeneratorState,
        attempt: Int,
        strategy: GenerationStrategy,
        progressListener: ((GenerationProgressUpdate) -> Unit)?,
        isCancelled: (() -> Boolean)?,
    ) {
        clearAutoTestMarks(state)
        val failedAttempts = linkedSetOf<String>()
        val size = state.grid.size
        var keepExpanding = true
        var expansionCount = 0
        val maxExpansions = size * size

        while (keepExpanding && expansionCount < maxExpansions) {
            ensureNotCancelled(isCancelled)
            keepExpanding = false
            expansionCount += 1

            val useClassicLineExpansion =
                state.ruleset.requireRowCoverage &&
                    state.ruleset.requireColumnCoverage &&
                    state.ruleset.orthogonalMinDistance >= size
            val constrainedWindowExpansion =
                if (!useClassicLineExpansion) {
                    eliminateConstrainedWindowsForExpansion(state.grid, state.ruleset)
                } else {
                    ConstrainedWindowExpansionResult(emptyList(), 0, 0, null)
                }
            val blockedSquares =
                if (useClassicLineExpansion) {
                    eliminateClassicConstrainedLinesForExpansion(state.grid, state.ruleset, false) +
                        eliminateClassicConstrainedLinesForExpansion(state.grid, state.ruleset, true)
                } else {
                    constrainedWindowExpansion.blockedSquares
                }
            if (constrainedWindowExpansion.windowHits > 0) {
                state.metrics.constrainedWindowHits += constrainedWindowExpansion.windowHits
                state.metrics.constrainedWindowFlags += constrainedWindowExpansion.blockedSquareCount
                emitProgress(
                    state,
                    attempt,
                    "CONSTRAINED_WINDOW_SUMMARY",
                    "Constrained windows found ${constrainedWindowExpansion.windowHits} saturated windows and " +
                        "${constrainedWindowExpansion.blockedSquareCount} blocked squares" +
                        (constrainedWindowExpansion.sampleWindowSummary?.let { " ($it)." } ?: "."),
                    strategy,
                    progressListener,
                )
            }

            val coloredSquares = state.grid.cells.flatten().count { cell -> cell.groupColor != null }
            if (coloredSquares == size * size) break

            val pressuredGroupMarkers = when (strategy) {
                GenerationStrategy.BASELINE -> emptyMap()
                GenerationStrategy.MARKER_GUIDED -> computePressuredGroupMarkers(state.grid, state.ruleset)
                GenerationStrategy.TEMPLATE_SEEDED -> emptyMap()
            }
            if (strategy == GenerationStrategy.MARKER_GUIDED) {
                state.metrics.markerSquares += pressuredGroupMarkers.size
                state.metrics.markerBlocks += pressuredGroupMarkers.values.sumOf { it.size }
            }

            val guidedCandidates = mutableListOf<ExpansionCandidate>()
            val fallbackCandidates = mutableListOf<ExpansionCandidate>()

            for ((position, responsibleColors) in blockedSquares) {
                if (state.grid.cells[position.row][position.col].groupColor != null) continue
                if (state.grid.cells[position.row][position.col].isBlackout) continue
                val directions = listOf(
                    1 to 0,
                    -1 to 0,
                    0 to 1,
                    0 to -1,
                ).shuffled(Random.Default)
                val pressuredGroups = pressuredGroupMarkers[position].orEmpty()
                for ((deltaRow, deltaCol) in directions) {
                    val neighborRow = position.row + deltaRow
                    val neighborCol = position.col + deltaCol
                    if (neighborRow !in 0 until size || neighborCol !in 0 until size) continue

                    if (state.grid.cells[neighborRow][neighborCol].isBlackout) continue
                    val neighborColor = state.grid.cells[neighborRow][neighborCol].groupColor ?: continue
                    if (neighborColor in responsibleColors) continue

                    val attemptKey = "${position.row},${position.col},$neighborColor"
                    if (attemptKey in failedAttempts) continue
                    if (strategy == GenerationStrategy.MARKER_GUIDED && pressuredGroups.isNotEmpty()) {
                        if (neighborColor !in pressuredGroups) {
                            guidedCandidates += ExpansionCandidate(position, neighborColor, attemptKey, true)
                            state.metrics.markerGuidedCandidates += 1
                        } else {
                            fallbackCandidates += ExpansionCandidate(position, neighborColor, attemptKey, false)
                        }
                    } else {
                        fallbackCandidates += ExpansionCandidate(position, neighborColor, attemptKey, false)
                    }
                }
            }

            if (fallbackCandidates.isEmpty() && guidedCandidates.isEmpty()) {
                collectGeneralExpansionCandidates(
                    state = state,
                    strategy = strategy,
                    pressuredGroupMarkers = pressuredGroupMarkers,
                    failedAttempts = failedAttempts,
                    guidedCandidates = guidedCandidates,
                    fallbackCandidates = fallbackCandidates,
                )
            }

            val orderedCandidates = if (guidedCandidates.isNotEmpty()) {
                guidedCandidates.shuffled(Random.Default) + fallbackCandidates.shuffled(Random.Default)
            } else {
                fallbackCandidates.shuffled(Random.Default)
            }

            if (orderedCandidates.isEmpty()) {
                emitProgress(
                    state,
                    attempt,
                    "BLOCKED_SQUARES_STALLED",
                    "No legal fill candidates found " +
                        "(colored=$coloredSquares/${size * size}, " +
                        "blockedSquares=${blockedSquares.size}, " +
                        "requireRowCoverage=${state.ruleset.requireRowCoverage}, " +
                        "requireColumnCoverage=${state.ruleset.requireColumnCoverage}).",
                    strategy,
                    progressListener,
                )
                break
            }

            for (candidate in orderedCandidates) {
                val originalColor = state.grid.cells[candidate.position.row][candidate.position.col].groupColor
                state.grid = paintCell(state.grid, candidate.position, candidate.neighborColor)
                emitProgress(
                    state,
                    attempt,
                    if (candidate.markerGuided) "BLOCKED_SQUARES_MARKER_GUIDED" else "BLOCKED_SQUARES_EXPANSION",
                    if (candidate.markerGuided) {
                        "Tried marker-guided fill at (${candidate.position.row}, ${candidate.position.col}) with ${candidate.neighborColor}."
                    } else {
                        "Tried fallback fill at (${candidate.position.row}, ${candidate.position.col}) with ${candidate.neighborColor}."
                    },
                    strategy,
                    progressListener,
                )

                if (isSolvable(state)) {
                    keepExpanding = true
                    state.metrics.successfulPlacements += 1
                    if (candidate.markerGuided) {
                        state.metrics.markerGuidedPlacements += 1
                    } else {
                        state.metrics.fallbackPlacements += 1
                    }
                    break
                }

                failedAttempts += candidate.attemptKey
                state.metrics.rollbacks += 1
                state.grid = paintCell(state.grid, candidate.position, originalColor)
                emitProgress(
                    state,
                    attempt,
                    "BLOCKED_SQUARES_ROLLBACK",
                    "Rolled back fill at (${candidate.position.row}, ${candidate.position.col}) after it broke solvability " +
                        "(${lastDeterministicAnalysisSummary(state).toLogString()}).",
                    strategy,
                    progressListener,
                )
            }
        }

        emitProgress(
            state,
            attempt,
            "BLOCKED_SQUARES_SUMMARY",
            "Blocked-square expansion finished " +
                "(colored=${state.grid.cells.flatten().count { it.groupColor != null }}/${size * size}, " +
                "solverChecks=${state.metrics.solverChecks}, rollbacks=${state.metrics.rollbacks}).",
            strategy,
            progressListener,
        )

        runAllSolverSteps(state)
    }

    private fun collectGeneralExpansionCandidates(
        state: GeneratorState,
        strategy: GenerationStrategy,
        pressuredGroupMarkers: Map<Position, Set<String>>,
        failedAttempts: Set<String>,
        guidedCandidates: MutableList<ExpansionCandidate>,
        fallbackCandidates: MutableList<ExpansionCandidate>,
    ) {
        val size = state.grid.size
        for (row in 0 until size) {
            for (col in 0 until size) {
                val cell = state.grid.cells[row][col]
                if (cell.groupColor != null) continue
                if (cell.isBlackout) continue

                val position = Position(row, col)
                val pressuredGroups = pressuredGroupMarkers[position].orEmpty()
                val neighborColors = linkedSetOf<String>()
                val directions = listOf(
                    1 to 0,
                    -1 to 0,
                    0 to 1,
                    0 to -1,
                ).shuffled(Random.Default)

                for ((deltaRow, deltaCol) in directions) {
                    val neighborRow = row + deltaRow
                    val neighborCol = col + deltaCol
                    if (neighborRow !in 0 until size || neighborCol !in 0 until size) continue
                    if (state.grid.cells[neighborRow][neighborCol].isBlackout) continue
                    state.grid.cells[neighborRow][neighborCol].groupColor?.let { neighborColors += it }
                }

                for (neighborColor in neighborColors) {
                    val attemptKey = "${row},${col},$neighborColor"
                    if (attemptKey in failedAttempts) continue

                    if (strategy == GenerationStrategy.MARKER_GUIDED && pressuredGroups.isNotEmpty()) {
                        if (neighborColor !in pressuredGroups) {
                            guidedCandidates += ExpansionCandidate(position, neighborColor, attemptKey, true)
                            state.metrics.markerGuidedCandidates += 1
                        } else {
                            fallbackCandidates += ExpansionCandidate(position, neighborColor, attemptKey, false)
                        }
                    } else {
                        fallbackCandidates += ExpansionCandidate(position, neighborColor, attemptKey, false)
                    }
                }
            }
        }
    }

    private data class ExpansionCandidate(
        val position: Position,
        val neighborColor: String,
        val attemptKey: String,
        val markerGuided: Boolean,
    )

    private fun paintCell(boardState: BoardState, position: Position, color: String?): BoardState =
        boardState.copy(
            cells = boardState.cells.mapIndexed { rowIndex, row ->
                row.mapIndexed { colIndex, cell ->
                    if (rowIndex == position.row && colIndex == position.col) {
                        cell.copy(groupColor = color)
                    } else {
                        cell
                    }
                }
            },
        )

    private fun computePressuredGroupMarkers(
        boardState: BoardState,
        ruleset: QueensRuleset,
    ): Map<Position, Set<String>> {
        val groups = linkedMapOf<String, MutableList<Position>>()
        for (row in 0 until boardState.size) {
            for (col in 0 until boardState.size) {
                val color = boardState.cells[row][col].groupColor ?: continue
                groups.getOrPut(color) { mutableListOf() }.add(Position(row, col))
            }
        }

        val markers = linkedMapOf<Position, Set<String>>()
        for (row in 0 until boardState.size) {
            for (col in 0 until boardState.size) {
                if (boardState.cells[row][col].groupColor != null) continue
                val candidate = Position(row, col)
                val pressuredGroups = groups.filterValues { positions ->
                    positions.all { position -> isThreatenedByCandidateQueen(candidate, position, ruleset) }
                }.keys

                if (pressuredGroups.isNotEmpty()) {
                    markers[candidate] = pressuredGroups
                }
            }
        }

        return markers
    }

    private fun isThreatenedByCandidateQueen(
        candidate: Position,
        target: Position,
        ruleset: QueensRuleset,
    ): Boolean = queensConstraintService.isConflict(candidate, target, ruleset)
}
