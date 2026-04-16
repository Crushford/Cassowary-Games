package com.queens.admin.application

import com.queens.admin.api.dto.StitchingPreviewBoardDto
import com.queens.admin.api.dto.StitchingPreviewCellDto
import com.queens.admin.api.dto.StitchingPreviewDto
import com.queens.admin.api.dto.StitchingPreviewQuadrantDto
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.model.QueensRuleset
import com.queens.admin.domain.service.QueensConstraintService
import kotlin.math.abs
import kotlin.random.Random
import org.springframework.stereotype.Service

@Service
class StitchingPreviewService(
    private val generationWorkflowService: GenerationWorkflowService,
    private val queensConstraintService: QueensConstraintService,
) {
    companion object {
        private const val BASE_SIZE = 7
        private const val ORTHOGONAL_MIN_DISTANCE = 5
        private const val MINIMUM_GROUP_SIZE = 3
        private const val GENERATION_STRATEGY = "baseline"
        private const val TOP_LEFT_TARGET_QUEEN_COUNT = 10
        private const val DEPENDENT_TARGET_QUEEN_COUNT = 9
    }

    private enum class PreviewCellState {
        ACTIVE,
        QUEEN,
        BLACKOUT,
        JOIN_FILL,
    }

    private data class PlacementResult(
        val queenCount: Int,
        val queens: List<Position>,
    )

    private data class QuadrantPiece(
        val pieceKind: String,
        val groupPrefix: String,
        val queenCount: Int,
        val targetQueenCount: Int,
        val blackoutCellCount: Int,
        val leftBlackoutSignature: List<Int>,
        val topBlackoutSignature: List<Int>,
        val activeGroups: Map<Position, String>,
        val queenPositions: Set<Position>,
        val groupSlots: Map<String, Int>,
        val board: StitchingPreviewBoardDto,
    )

    private data class FinalCell(
        val groupId: String? = null,
        val queen: Boolean = false,
        val filledFromBlackout: Boolean = false,
        val wasBlackout: Boolean = false,
    )

    fun buildPreview(): StitchingPreviewDto {
        val ruleset =
            QueensRuleset(
                orthogonalMinDistance = ORTHOGONAL_MIN_DISTANCE,
                forbidDiagonalTouch = true,
                requireRowCoverage = false,
                requireColumnCoverage = false,
            )

        val topLeftBoard = generateTopLeftBoard()
        val topLeft = buildStandardQuadrant(topLeftBoard, pieceKind = "TOP_LEFT", groupPrefix = "TL")

        val topRight =
            buildIrregularQuadrant(
                pieceKind = "TOP_RIGHT",
                groupPrefix = "TR",
                leftBlackoutSignature = computeHorizontalBleed(topLeft.queenPositions.toList(), ruleset),
                topBlackoutSignature = List(BASE_SIZE) { 0 },
                ruleset = ruleset,
            )

        val bottomLeft =
            buildIrregularQuadrant(
                pieceKind = "BOTTOM_LEFT",
                groupPrefix = "BL",
                leftBlackoutSignature = List(BASE_SIZE) { 0 },
                topBlackoutSignature = computeVerticalBleed(topLeft.queenPositions.toList(), ruleset),
                ruleset = ruleset,
            )

        val bottomRight =
            buildIrregularQuadrant(
                pieceKind = "BOTTOM_RIGHT",
                groupPrefix = "BR",
                leftBlackoutSignature = computeHorizontalBleed(bottomLeft.queenPositions.toList(), ruleset),
                topBlackoutSignature = computeVerticalBleed(topRight.queenPositions.toList(), ruleset),
                ruleset = ruleset,
            )

        return StitchingPreviewDto(
            size = BASE_SIZE,
            orthogonalMinDistance = ORTHOGONAL_MIN_DISTANCE,
            minimumGroupSize = MINIMUM_GROUP_SIZE,
            topLeft = topLeft.toDto(),
            topRight = topRight.toDto(),
            bottomLeft = bottomLeft.toDto(),
            bottomRight = bottomRight.toDto(),
            stitchedBoard = buildStitchedBoard(topLeft, topRight, bottomLeft, bottomRight),
        )
    }

    private fun generateTopLeftBoard(): BoardState {
        val result =
            generationWorkflowService.generateValidBoard(
                size = BASE_SIZE,
                queenCountMode = "exact",
                targetQueenCount = TOP_LEFT_TARGET_QUEEN_COUNT,
                orthogonalMinDistance = ORTHOGONAL_MIN_DISTANCE,
                minimumGroupSize = MINIMUM_GROUP_SIZE,
                generationStrategy = GENERATION_STRATEGY,
            )
        return result.boardState ?: throw IllegalStateException(
            "Top-Left generation failed: could not produce a ${BASE_SIZE}×${BASE_SIZE} board " +
                "with exactly $TOP_LEFT_TARGET_QUEEN_COUNT queens at orthogonal distance $ORTHOGONAL_MIN_DISTANCE. " +
                (result.errors.firstOrNull()?.let { "Detail: $it" } ?: ""),
        )
    }

    private fun buildStandardQuadrant(
        boardState: BoardState,
        pieceKind: String,
        groupPrefix: String,
    ): QuadrantPiece {
        val queens =
            boardState.cells.flatten()
                .filter { it.isSolutionQueen }
                .map { it.position }
                .toSet()
        val groups = renameBoardGroups(boardState, groupPrefix)
        val groupSlots = slotMapFor(groups.values)

        return QuadrantPiece(
            pieceKind = pieceKind,
            groupPrefix = groupPrefix,
            queenCount = queens.size,
            targetQueenCount = TOP_LEFT_TARGET_QUEEN_COUNT,
            blackoutCellCount = 0,
            leftBlackoutSignature = List(BASE_SIZE) { 0 },
            topBlackoutSignature = List(BASE_SIZE) { 0 },
            activeGroups = groups,
            queenPositions = queens,
            groupSlots = groupSlots,
            board =
                StitchingPreviewBoardDto(
                    width = BASE_SIZE,
                    height = BASE_SIZE,
                    cells =
                        (0 until BASE_SIZE).map { row ->
                            (0 until BASE_SIZE).map { col ->
                                buildCellDto(
                                    position = Position(row, col),
                                    groups = groups,
                                    groupSlots = groupSlots,
                                    queenPositions = queens,
                                    blackoutPositions = emptySet(),
                                )
                            }
                        },
                ),
        )
    }

    /**
     * Generates a quadrant piece for the given blackout shape.
     *
     * The blackout signatures define which cells are excluded from this piece's active region.
     * Queens are placed only within the active region using a backtracking solver. This method
     * is the canonical entry point for blackout-shape-aware generation: callers supply the
     * signatures directly and the generator resolves the best placement within those constraints.
     *
     * If the best achievable placement cannot meet [targetQueenCount], generation fails loudly
     * rather than silently lowering the target.
     */
    private fun buildIrregularQuadrant(
        pieceKind: String,
        groupPrefix: String,
        leftBlackoutSignature: List<Int>,
        topBlackoutSignature: List<Int>,
        ruleset: QueensRuleset,
        targetQueenCount: Int = DEPENDENT_TARGET_QUEEN_COUNT,
    ): QuadrantPiece {
        validateSignatures(leftBlackoutSignature, topBlackoutSignature)
        val blackoutPositions =
            (0 until BASE_SIZE).flatMap { row ->
                (0 until BASE_SIZE).mapNotNull { col ->
                    if (col < leftBlackoutSignature[row] || row < topBlackoutSignature[col]) {
                        Position(row, col)
                    } else {
                        null
                    }
                }
            }.toSet()
        val activePositions =
            (0 until BASE_SIZE).flatMap { row ->
                (0 until BASE_SIZE).mapNotNull { col ->
                    val position = Position(row, col)
                    if (position in blackoutPositions) null else position
                }
            }

        val placement = resolveMaxPlacement(activePositions, ruleset)

        if (placement.queenCount < targetQueenCount) {
            val quadrantLabel =
                when (pieceKind) {
                    "TOP_RIGHT" -> "Top-Right"
                    "BOTTOM_LEFT" -> "Bottom-Left"
                    "BOTTOM_RIGHT" -> "Bottom-Right"
                    else -> pieceKind
                }
            throw IllegalStateException(
                "$quadrantLabel generation failed: the blackout shape allows only ${placement.queenCount} queens " +
                    "but the target is $targetQueenCount. The incoming bleed signatures may be too restrictive. " +
                    "Left signature: [${leftBlackoutSignature.joinToString()}], " +
                    "Top signature: [${topBlackoutSignature.joinToString()}]",
            )
        }

        val groups = assignGroupsToActiveCells(activePositions, placement.queens, groupPrefix)
        val groupSlots = slotMapFor(groups.values)
        val queens = placement.queens.toSet()

        return QuadrantPiece(
            pieceKind = pieceKind,
            groupPrefix = groupPrefix,
            queenCount = placement.queenCount,
            targetQueenCount = targetQueenCount,
            blackoutCellCount = blackoutPositions.size,
            leftBlackoutSignature = leftBlackoutSignature,
            topBlackoutSignature = topBlackoutSignature,
            activeGroups = groups,
            queenPositions = queens,
            groupSlots = groupSlots,
            board =
                StitchingPreviewBoardDto(
                    width = BASE_SIZE,
                    height = BASE_SIZE,
                    cells =
                        (0 until BASE_SIZE).map { row ->
                            (0 until BASE_SIZE).map { col ->
                                buildCellDto(
                                    position = Position(row, col),
                                    groups = groups,
                                    groupSlots = groupSlots,
                                    queenPositions = queens,
                                    blackoutPositions = blackoutPositions,
                                )
                            }
                        },
                ),
        )
    }

    private fun buildStitchedBoard(
        topLeft: QuadrantPiece,
        topRight: QuadrantPiece,
        bottomLeft: QuadrantPiece,
        bottomRight: QuadrantPiece,
    ): StitchingPreviewBoardDto {
        val cells = mutableMapOf<Position, FinalCell>()
        val randomSeed =
            listOf(topRight, bottomLeft, bottomRight)
                .flatMap { it.leftBlackoutSignature + it.topBlackoutSignature }
                .sum() + topLeft.queenCount + topRight.queenCount + bottomLeft.queenCount + bottomRight.queenCount
        val random = Random(randomSeed)

        fun placeQuadrant(
            quadrant: QuadrantPiece,
            rowOffset: Int,
            colOffset: Int,
        ) {
            val blackoutPositions = blackoutPositionsFor(quadrant.leftBlackoutSignature, quadrant.topBlackoutSignature)
            for (row in 0 until BASE_SIZE) {
                for (col in 0 until BASE_SIZE) {
                    val local = Position(row, col)
                    val global = Position(row + rowOffset, col + colOffset)
                    if (local in blackoutPositions) {
                        cells[global] = FinalCell(wasBlackout = true)
                        continue
                    }

                    cells[global] =
                        FinalCell(
                            groupId = quadrant.activeGroups[local],
                            queen = local in quadrant.queenPositions,
                        )
                }
            }
        }

        placeQuadrant(topLeft, rowOffset = 0, colOffset = 0)
        placeQuadrant(topRight, rowOffset = 0, colOffset = BASE_SIZE)
        placeQuadrant(bottomLeft, rowOffset = BASE_SIZE, colOffset = 0)
        placeQuadrant(bottomRight, rowOffset = BASE_SIZE, colOffset = BASE_SIZE)

        val unresolved =
            cells.filterValues { it.wasBlackout }
                .keys
                .toMutableSet()

        while (unresolved.isNotEmpty()) {
            var progress = false
            val toResolve = unresolved.toList()
            for (position in toResolve) {
                val adjacentGroups =
                    orthogonalNeighbors(position, BASE_SIZE * 2)
                        .mapNotNull { neighbor -> cells[neighbor]?.groupId }
                        .distinct()
                if (adjacentGroups.isEmpty()) continue

                val chosenGroup = adjacentGroups[random.nextInt(adjacentGroups.size)]
                cells[position] =
                    FinalCell(
                        groupId = chosenGroup,
                        queen = false,
                        filledFromBlackout = true,
                        wasBlackout = true,
                    )
                unresolved.remove(position)
                progress = true
            }

            check(progress) {
                "Unable to resolve stitched blackout cells into adjacent color groups."
            }
        }

        val groupSlots = slotMapFor(cells.values.mapNotNull { it.groupId })

        return StitchingPreviewBoardDto(
            width = BASE_SIZE * 2,
            height = BASE_SIZE * 2,
            cells =
                (0 until BASE_SIZE * 2).map { row ->
                    (0 until BASE_SIZE * 2).map { col ->
                        val cell = requireNotNull(cells[Position(row, col)])
                        val state =
                            when {
                                cell.queen -> PreviewCellState.QUEEN
                                cell.filledFromBlackout -> PreviewCellState.JOIN_FILL
                                else -> PreviewCellState.ACTIVE
                            }
                        StitchingPreviewCellDto(
                            state = state.apiValue(),
                            groupId = cell.groupId,
                            groupSlot = cell.groupId?.let(groupSlots::get),
                        )
                    }
                },
        )
    }

    private fun computeHorizontalBleed(
        queens: List<Position>,
        ruleset: QueensRuleset,
    ): List<Int> =
        List(BASE_SIZE) { row ->
            var prefixLength = 0
            while (prefixLength < BASE_SIZE && conflictsWithQueensAcrossRight(queens, ruleset, row, prefixLength)) {
                prefixLength += 1
            }
            prefixLength
        }

    private fun computeVerticalBleed(
        queens: List<Position>,
        ruleset: QueensRuleset,
    ): List<Int> =
        List(BASE_SIZE) { col ->
            var prefixLength = 0
            while (prefixLength < BASE_SIZE && conflictsWithQueensAcrossBottom(queens, ruleset, prefixLength, col)) {
                prefixLength += 1
            }
            prefixLength
        }

    private fun conflictsWithQueensAcrossRight(
        queens: List<Position>,
        ruleset: QueensRuleset,
        row: Int,
        localCol: Int,
    ): Boolean {
        val candidate = Position(row, BASE_SIZE + localCol)
        return queens.any { queen ->
            queensConstraintService.isConflict(queen, candidate, ruleset)
        }
    }

    private fun conflictsWithQueensAcrossBottom(
        queens: List<Position>,
        ruleset: QueensRuleset,
        localRow: Int,
        col: Int,
    ): Boolean {
        val candidate = Position(BASE_SIZE + localRow, col)
        return queens.any { queen ->
            queensConstraintService.isConflict(queen, candidate, ruleset)
        }
    }

    private fun renameBoardGroups(
        boardState: BoardState,
        groupPrefix: String,
    ): Map<Position, String> {
        val colorIds =
            boardState.cells.flatten()
                .mapNotNull { it.groupColor }
                .distinct()
                .sorted()
                .withIndex()
                .associate { (index, color) -> color to "$groupPrefix-g${(index + 1).toString().padStart(2, '0')}" }

        return boardState.cells.flatten()
            .mapNotNull { cell ->
                cell.groupColor?.let { color ->
                    cell.position to requireNotNull(colorIds[color])
                }
            }
            .toMap()
    }

    private fun assignGroupsToActiveCells(
        activePositions: List<Position>,
        queens: List<Position>,
        groupPrefix: String,
    ): Map<Position, String> {
        if (queens.isEmpty()) return emptyMap()

        val groupIds =
            queens.sortedWith(compareBy<Position>({ it.row }, { it.col }))
                .withIndex()
                .associate { (index, position) ->
                    position to "$groupPrefix-g${(index + 1).toString().padStart(2, '0')}"
                }

        return activePositions.associateWith { position ->
            val nearestQueen =
                queens.minWith(
                    compareBy<Position>(
                        { manhattanDistance(position, it) },
                        { abs(position.row - it.row) },
                        { abs(position.col - it.col) },
                        { it.row },
                        { it.col },
                    ),
                )
            requireNotNull(groupIds[nearestQueen])
        }
    }

    private fun buildCellDto(
        position: Position,
        groups: Map<Position, String>,
        groupSlots: Map<String, Int>,
        queenPositions: Set<Position>,
        blackoutPositions: Set<Position>,
    ): StitchingPreviewCellDto {
        if (position in blackoutPositions) {
            return StitchingPreviewCellDto(state = PreviewCellState.BLACKOUT.apiValue())
        }

        val groupId = groups[position]
        return StitchingPreviewCellDto(
            state = if (position in queenPositions) PreviewCellState.QUEEN.apiValue() else PreviewCellState.ACTIVE.apiValue(),
            groupId = groupId,
            groupSlot = groupId?.let(groupSlots::get),
        )
    }

    private fun blackoutPositionsFor(
        leftBlackoutSignature: List<Int>,
        topBlackoutSignature: List<Int>,
    ): Set<Position> =
        (0 until BASE_SIZE).flatMap { row ->
            (0 until BASE_SIZE).mapNotNull { col ->
                if (col < leftBlackoutSignature[row] || row < topBlackoutSignature[col]) {
                    Position(row, col)
                } else {
                    null
                }
            }
        }.toSet()

    private fun validateSignatures(
        leftBlackoutSignature: List<Int>,
        topBlackoutSignature: List<Int>,
    ) {
        require(leftBlackoutSignature.size == BASE_SIZE) { "Left blackout signature must match board size." }
        require(topBlackoutSignature.size == BASE_SIZE) { "Top blackout signature must match board size." }
        require(leftBlackoutSignature.all { it in 0..BASE_SIZE }) { "Left blackout signature contains invalid prefix values." }
        require(topBlackoutSignature.all { it in 0..BASE_SIZE }) { "Top blackout signature contains invalid prefix values." }
    }

    private fun orthogonalNeighbors(position: Position, boardSize: Int): List<Position> =
        listOf(
            Position(position.row - 1, position.col),
            Position(position.row + 1, position.col),
            Position(position.row, position.col - 1),
            Position(position.row, position.col + 1),
        ).filter { candidate ->
            candidate.row in 0 until boardSize && candidate.col in 0 until boardSize
        }

    private fun slotMapFor(groupIds: Collection<String>): Map<String, Int> =
        groupIds.distinct()
            .sorted()
            .withIndex()
            .associate { (index, groupId) -> groupId to index }

    private fun manhattanDistance(left: Position, right: Position): Int =
        abs(left.row - right.row) + abs(left.col - right.col)

    private fun resolveMaxPlacement(
        activePositions: List<Position>,
        ruleset: QueensRuleset,
    ): PlacementResult {
        val placed = mutableListOf<Position>()
        var best = emptyList<Position>()

        fun backtrack(startIndex: Int) {
            if (placed.size > best.size) {
                best = placed.toList()
            }
            if (startIndex >= activePositions.size) {
                return
            }
            if (placed.size + (activePositions.size - startIndex) <= best.size) {
                return
            }

            for (index in startIndex until activePositions.size) {
                val candidate = activePositions[index]
                if (!queensConstraintService.isValidPlacement(candidate, placed, ruleset)) continue
                placed += candidate
                backtrack(index + 1)
                placed.removeLast()
            }
        }

        backtrack(0)
        return PlacementResult(
            queenCount = best.size,
            queens = best,
        )
    }

    private fun QuadrantPiece.toDto(): StitchingPreviewQuadrantDto =
        StitchingPreviewQuadrantDto(
            pieceKind = pieceKind,
            queenCount = queenCount,
            targetQueenCount = targetQueenCount,
            blackoutCellCount = blackoutCellCount,
            leftBlackoutSignature = leftBlackoutSignature,
            topBlackoutSignature = topBlackoutSignature,
            board = board,
        )

    private fun PreviewCellState.apiValue(): String = name.lowercase().replace('_', '-')
}
