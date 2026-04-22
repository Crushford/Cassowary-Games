package com.queens.admin.domain.service

import com.queens.admin.domain.model.ActionType
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.ChangedCell
import com.queens.admin.domain.model.GenerationPhase
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.OperationResult
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.model.QueensBoardMetadata
import org.slf4j.LoggerFactory
import java.time.Duration
import java.time.Instant
import org.springframework.stereotype.Service
import kotlin.random.Random

@Service
class QueenPlacementService(
    private val boardValidationService: BoardValidationService,
    private val queensConstraintService: QueensConstraintService,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(QueenPlacementService::class.java)
        private const val MAX_QUEEN_PROGRESS_LOG_INTERVAL = 100_000L
    }

    fun resolveTargetQueenCount(
        size: Int,
        requestedTargetQueenCount: Int,
        queenCountMode: String,
        ruleset: com.queens.admin.domain.model.QueensRuleset,
        progressListener: ((String) -> Unit)? = null,
        allowExpensiveSearch: Boolean = false,
    ): Int {
        return if (queenCountMode.equals("max", ignoreCase = true)) {
            val precomputed = PrecomputedMaxQueenCounts.get(size, ruleset.orthogonalMinDistance)
            if (precomputed != null) {
                progressListener?.invoke(
                    "Using precomputed max queen count $precomputed for ${size}x$size with orthogonal distance ${ruleset.orthogonalMinDistance}.",
                )
                logger.info(
                    "Using precomputed max queen count size={} orthogonalMinDistance={} resolvedTargetQueenCount={}",
                    size,
                    ruleset.orthogonalMinDistance,
                    precomputed,
                )
                return precomputed
            }
            if (!allowExpensiveSearch) {
                val supportedDistances = PrecomputedMaxQueenCounts.supportedDistancesForSize(size)
                throw IllegalArgumentException(
                    if (supportedDistances.isEmpty()) {
                        "Max queen mode is not available yet for ${size}x$size boards."
                    } else {
                        "Max queen mode is not available yet for ${size}x$size with orthogonal distance ${ruleset.orthogonalMinDistance}. Supported distances: ${supportedDistances.joinToString(", ")}."
                    },
                )
            }
            progressListener?.invoke(
                "Resolving max queen count for ${size}x$size with orthogonal distance ${ruleset.orthogonalMinDistance}.",
            )
            logger.info(
                "Resolving max queen count size={} requestedTargetQueenCount={} orthogonalMinDistance={} requireRowCoverage={} requireColumnCoverage={}",
                size,
                requestedTargetQueenCount,
                ruleset.orthogonalMinDistance,
                ruleset.requireRowCoverage,
                ruleset.requireColumnCoverage,
            )
            maxQueensForBoard(size, ruleset, progressListener).also { resolved ->
                logger.info(
                    "Resolved max queen count size={} requestedTargetQueenCount={} resolvedTargetQueenCount={} orthogonalMinDistance={}",
                    size,
                    requestedTargetQueenCount,
                    resolved,
                    ruleset.orthogonalMinDistance,
                )
            }
        } else {
            requestedTargetQueenCount
        }
    }

    fun hasPrecomputedMaxQueenCount(size: Int, orthogonalMinDistance: Int): Boolean =
        PrecomputedMaxQueenCounts.has(size, orthogonalMinDistance)

    fun supportedPrecomputedDistances(size: Int): List<Int> =
        PrecomputedMaxQueenCounts.supportedDistancesForSize(size)

    fun maxQueensForBlackoutBoard(
        size: Int,
        blackoutPositions: Set<Position>,
        ruleset: com.queens.admin.domain.model.QueensRuleset,
        progressListener: ((String) -> Unit)? = null,
    ): Int {
        if (blackoutPositions.isEmpty()) {
            return maxQueensForBoard(size, ruleset, progressListener)
        }
        val playablePositions =
            (0 until size).flatMap { row ->
                (0 until size).mapNotNull { col ->
                    val position = Position(row, col)
                    if (position !in blackoutPositions) position else null
                }
            }
        logger.info(
            "Resolving blackout-aware max queen count size={} orthogonalMinDistance={} playableCells={} blackoutCells={}",
            size,
            ruleset.orthogonalMinDistance,
            playablePositions.size,
            blackoutPositions.size,
        )
        progressListener?.invoke(
            "Resolving blackout-aware max queen count across ${playablePositions.size} playable cells.",
        )
        return maxQueensForPositions(
            candidatePositions = playablePositions,
            size = size,
            ruleset = ruleset,
            progressListener = progressListener,
            progressPrefix = "Blackout-aware max queen search",
        )
    }

    fun placeQueens(boardState: BoardState): OperationResult {
        val targetQueenCount = QueensBoardMetadata.targetQueenCount(boardState)
        val ruleset = QueensBoardMetadata.ruleset(boardState)
        val positions = placeQueensForBoard(boardState.size, targetQueenCount, ruleset)
            ?: return OperationResult(
                success = false,
                actionType = ActionType.PLACE_QUEENS,
                explanation = "Could not place $targetQueenCount queens on a ${boardState.size}x${boardState.size} board with orthogonal distance ${ruleset.orthogonalMinDistance}.",
                boardState = boardState,
                errors = listOf(
                    "Could not place $targetQueenCount queens on a ${boardState.size}x${boardState.size} board with orthogonal distance ${ruleset.orthogonalMinDistance}.",
                ),
                validation = boardValidationService.validate(boardState),
            )
        val updatedCells = boardState.cells.mapIndexed { rowIndex, row ->
            row.mapIndexed { colIndex, cell ->
                if (Position(rowIndex, colIndex) in positions) {
                    cell.copy(markType = MarkType.QUEEN, isSolutionQueen = true)
                } else {
                    cell
                }
            }
        }
        val updatedBoard = boardState.copy(
            cells = updatedCells,
            generationPhase = GenerationPhase.QUEENS_PLACED,
        )
        val validation = boardValidationService.validate(updatedBoard)

        return OperationResult(
            success = true,
            actionType = ActionType.PLACE_QUEENS,
            explanation = "Placed $targetQueenCount queens using the current board ruleset.",
            boardState = updatedBoard.copy(metadata = boardState.metadata),
            changedCells = positions.map { position ->
                ChangedCell(row = position.row, col = position.col, changeType = "QUEEN_PLACED", explanation = "generation seed queen")
            },
            warnings = validation.warnings,
            errors = validation.errors,
            validation = validation,
        )
    }

    private fun placeQueensForBoard(
        size: Int,
        targetQueenCount: Int,
        ruleset: com.queens.admin.domain.model.QueensRuleset,
    ): List<Position>? {
        val allPositions = (0 until size).flatMap { row ->
            (0 until size).map { col -> Position(row, col) }
        }
        val placed = mutableListOf<Position>()
        val random = Random.Default

        fun backtrack(startIndex: Int): Boolean {
            if (placed.size == targetQueenCount) return true
            if (allPositions.size - startIndex < targetQueenCount - placed.size) return false

            val candidates = allPositions.drop(startIndex).shuffled(random)
            for (candidate in candidates) {
                if (!queensConstraintService.isValidPlacement(candidate, placed, ruleset)) continue
                placed += candidate
                if (backtrack(allPositions.indexOf(candidate) + 1)) {
                    return true
                }
                placed.removeLast()
            }
            return false
        }

        return if (backtrack(0)) placed.toList() else null
    }

    private fun maxQueensForBoard(
        size: Int,
        ruleset: com.queens.admin.domain.model.QueensRuleset,
        progressListener: ((String) -> Unit)? = null,
    ): Int {
        val allPositions = (0 until size).flatMap { row ->
            (0 until size).map { col -> Position(row, col) }
        }
        return maxQueensForPositions(
            candidatePositions = allPositions,
            size = size,
            ruleset = ruleset,
            progressListener = progressListener,
            progressPrefix = "Max queen search",
        )
    }

    private fun maxQueensForPositions(
        candidatePositions: List<Position>,
        size: Int,
        ruleset: com.queens.admin.domain.model.QueensRuleset,
        progressListener: ((String) -> Unit)? = null,
        progressPrefix: String,
    ): Int {
        val startedAt = Instant.now()
        val placed = mutableListOf<Position>()
        var best = 0
        var exploredNodes = 0L
        var lastLoggedNodeCount = 0L

        fun backtrack(startIndex: Int) {
            exploredNodes += 1
            if (exploredNodes - lastLoggedNodeCount >= MAX_QUEEN_PROGRESS_LOG_INTERVAL) {
                lastLoggedNodeCount = exploredNodes
                val progressMessage =
                    "$progressPrefix explored $exploredNodes nodes, current branch has ${placed.size} queens, best so far is $best."
                logger.info(
                    "{} progress size={} orthogonalMinDistance={} exploredNodes={} currentPlaced={} bestSoFar={} elapsedMs={}",
                    progressPrefix,
                    size,
                    ruleset.orthogonalMinDistance,
                    exploredNodes,
                    placed.size,
                    best,
                    Duration.between(startedAt, Instant.now()).toMillis(),
                )
                progressListener?.invoke(progressMessage)
            }
            if (placed.size > best) {
                best = placed.size
                val bestMessage = "$progressPrefix found a new best candidate with $best queens."
                logger.info(
                    "{} found new best size={} orthogonalMinDistance={} best={} exploredNodes={} elapsedMs={}",
                    progressPrefix,
                    size,
                    ruleset.orthogonalMinDistance,
                    best,
                    exploredNodes,
                    Duration.between(startedAt, Instant.now()).toMillis(),
                )
                progressListener?.invoke(bestMessage)
            }
            if (startIndex >= candidatePositions.size) {
                return
            }
            if (placed.size + (candidatePositions.size - startIndex) <= best) {
                return
            }

            for (index in startIndex until candidatePositions.size) {
                val candidate = candidatePositions[index]
                if (!queensConstraintService.isValidPlacement(candidate, placed, ruleset)) continue
                placed += candidate
                backtrack(index + 1)
                placed.removeLast()
            }
        }

        backtrack(0)
        logger.info(
            "{} resolved size={} orthogonalMinDistance={} best={} exploredNodes={} elapsedMs={}",
            progressPrefix,
            size,
            ruleset.orthogonalMinDistance,
            best,
            exploredNodes,
            Duration.between(startedAt, Instant.now()).toMillis(),
        )
        progressListener?.invoke("$progressPrefix resolved to $best.")
        return best
    }
}
