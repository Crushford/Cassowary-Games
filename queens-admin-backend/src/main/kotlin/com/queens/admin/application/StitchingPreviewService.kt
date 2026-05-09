package com.queens.admin.application

import com.queens.admin.api.dto.StitchingPreviewBoardDto
import com.queens.admin.api.dto.StitchingPreviewCellDto
import com.queens.admin.api.dto.StitchingPreviewChunkDto
import com.queens.admin.api.dto.StitchingPreviewDto
import com.queens.admin.api.dto.StitchingPreviewSeamDto
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.model.QueensRuleset
import com.queens.admin.domain.service.QueensConstraintService
import kotlin.math.abs
import kotlin.random.Random
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

class InsufficientRegionSizeException(message: String) : Exception(message)

@Service
class StitchingPreviewService(
    private val generationWorkflowService: GenerationWorkflowService,
    private val queensConstraintService: QueensConstraintService,
) {
    private val logger = LoggerFactory.getLogger(StitchingPreviewService::class.java)

    companion object {
        const val BASE_SIZE = 7
        const val ORTHOGONAL_MIN_DISTANCE = 5
        const val MINIMUM_GROUP_SIZE = 3
        const val IRREGULAR_GENERATION_MINIMUM_GROUP_SIZE = 1
        const val GENERATION_STRATEGY = "baseline"
        const val TOP_LEFT_TARGET_QUEEN_COUNT = 10
        const val DEPENDENT_TARGET_QUEEN_COUNT = 9
    }

    data class GeneratedCatalogPiece(
        val pieceKind: String,
        val queenCount: Int,
        val targetQueenCount: Int,
        val blackoutCellCount: Int,
        val leftBlackoutSignature: List<Int>,
        val topBlackoutSignature: List<Int>,
        val queenPositions: Set<Position>,
        val layout: String,
        val queens: String,
        val board: StitchingPreviewBoardDto,
        val minGroupSize: Int,
        val effectiveMinGroupSize: Int,
        val blackoutFillOverrides: List<BlackoutFillOverride>,
        val minGroupShortfallReason: String? = null,
    )

    data class BlackoutFillOverride(
        val row: Int,
        val col: Int,
        val groupSymbol: String,
    )

    data class OutgoingFingerprintPair(
        val rightSignature: List<Int>,
        val bottomSignature: List<Int>,
    )

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
        val blackoutPositions: Set<Position>,
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

        val zeroLeftSignature = List(BASE_SIZE) { 0 }
        val chunkOne =
            buildStandardQuadrant(
                generateTopLeftBoard(),
                pieceKind = "VERTICAL_1",
                groupPrefix = "V1",
            )
        val seamOneSignature = computeVerticalBleed(chunkOne.queenPositions.toList(), ruleset)
        val chunkTwo =
            buildIrregularQuadrant(
                pieceKind = "VERTICAL_2",
                groupPrefix = "V2",
                leftBlackoutSignature = zeroLeftSignature,
                topBlackoutSignature = seamOneSignature,
                ruleset = ruleset,
            )
        val seamTwoSignature = computeVerticalBleed(chunkTwo.queenPositions.toList(), ruleset)
        val chunkThree =
            buildIrregularQuadrant(
                pieceKind = "VERTICAL_3",
                groupPrefix = "V3",
                leftBlackoutSignature = zeroLeftSignature,
                topBlackoutSignature = seamTwoSignature,
                ruleset = ruleset,
            )
        val chunks = listOf(chunkOne, chunkTwo, chunkThree)

        return StitchingPreviewDto(
            size = BASE_SIZE,
            orthogonalMinDistance = ORTHOGONAL_MIN_DISTANCE,
            minimumGroupSize = MINIMUM_GROUP_SIZE,
            chunks = chunks.map { it.toDto() },
            seams =
                listOf(
                    StitchingPreviewSeamDto(
                        fromChunkIndex = 0,
                        toChunkIndex = 1,
                        bottomSignature = seamOneSignature,
                        topSignature = chunkTwo.topBlackoutSignature,
                    ),
                    StitchingPreviewSeamDto(
                        fromChunkIndex = 1,
                        toChunkIndex = 2,
                        bottomSignature = seamTwoSignature,
                        topSignature = chunkThree.topBlackoutSignature,
                    ),
                ),
            stitchedBoard = buildVerticalStitchedBoard(chunks),
        )
    }

    fun generateCatalogPiece(
        pieceKind: String,
        leftBlackoutSignature: List<Int>,
        topBlackoutSignature: List<Int>,
        targetQueenCount: Int,
        allowTargetFallbackToMax: Boolean = false,
        randomSeed: Long? = null,
    ): GeneratedCatalogPiece {
        val ruleset =
            QueensRuleset(
                orthogonalMinDistance = ORTHOGONAL_MIN_DISTANCE,
                forbidDiagonalTouch = true,
                requireRowCoverage = false,
                requireColumnCoverage = false,
            )

        val normalizedPieceKind = pieceKind.uppercase()
        val generated =
            if (normalizedPieceKind == "TOP_LEFT" && leftBlackoutSignature.all { it == 0 } && topBlackoutSignature.all { it == 0 }) {
                val boardState = generateTopLeftBoard()
                buildStandardQuadrant(boardState, pieceKind = normalizedPieceKind, groupPrefix = "ST")
            } else {
                buildIrregularQuadrant(
                    pieceKind = normalizedPieceKind,
                    groupPrefix = "ST",
                    leftBlackoutSignature = leftBlackoutSignature,
                    topBlackoutSignature = topBlackoutSignature,
                    ruleset = ruleset,
                    targetQueenCount = targetQueenCount,
                    allowTargetFallbackToMax = allowTargetFallbackToMax,
                    randomSeed = randomSeed,
                    minimumGroupSizeForGeneration = IRREGULAR_GENERATION_MINIMUM_GROUP_SIZE,
                )
            }

        val groupSizes = generated.activeGroups.values.groupingBy { it }.eachCount()
        val minGroupSize = groupSizes.values.minOrNull() ?: 0
        val encoded = encodeQuadrant(generated)
        val blackoutFillOverrides = computeBlackoutFillOverrides(
            layout = encoded.first,
            boardSize = BASE_SIZE,
            minimumGroupSize = MINIMUM_GROUP_SIZE,
        )
        val effectiveMinGroupSize =
            computeEffectiveMinGroupSize(
                layout = encoded.first,
                boardSize = BASE_SIZE,
                blackoutFillOverrides = blackoutFillOverrides,
            )
        val minGroupShortfallReason =
            describeMinGroupShortfall(
                layout = encoded.first,
                boardSize = BASE_SIZE,
                minimumGroupSize = MINIMUM_GROUP_SIZE,
                blackoutFillOverrides = blackoutFillOverrides,
            )
        return GeneratedCatalogPiece(
            pieceKind = generated.pieceKind,
            queenCount = generated.queenCount,
            targetQueenCount = generated.targetQueenCount,
            blackoutCellCount = generated.blackoutCellCount,
            leftBlackoutSignature = generated.leftBlackoutSignature,
            topBlackoutSignature = generated.topBlackoutSignature,
            queenPositions = generated.queenPositions,
            layout = encoded.first,
            queens = encoded.second,
            board = generated.board,
            minGroupSize = minGroupSize,
            effectiveMinGroupSize = effectiveMinGroupSize,
            blackoutFillOverrides = blackoutFillOverrides,
            minGroupShortfallReason = minGroupShortfallReason,
        )
    }

    fun computeBlackoutFillOverrides(
        layout: String,
        boardSize: Int,
        minimumGroupSize: Int,
    ): List<BlackoutFillOverride> {
        if (minimumGroupSize <= 1) return emptyList()
        if (layout.length != boardSize * boardSize) return emptyList()

        val colorCounts = linkedMapOf<Char, Int>()
        val blackoutCells = mutableListOf<Position>()

        for (index in layout.indices) {
            val symbol = layout[index]
            if (symbol == '.') {
                blackoutCells += Position(index / boardSize, index % boardSize)
            } else {
                colorCounts[symbol] = (colorCounts[symbol] ?: 0) + 1
            }
        }

        if (colorCounts.isEmpty() || blackoutCells.isEmpty()) return emptyList()

        val blackoutSet = blackoutCells.toSet()
        val assignments = linkedMapOf<Position, Char>()
        val orderedBlackouts = blackoutCells.sortedWith(compareBy<Position>({ it.row }, { it.col }))
        val orderedColors = colorCounts.keys.sorted()

        fun cellBelongsToColor(position: Position, color: Char): Boolean {
            val index = position.row * boardSize + position.col
            val symbol = layout[index]
            if (symbol == color) return true
            return assignments[position] == color
        }

        fun candidateForColor(color: Char): Position? {
            return orderedBlackouts
                .asSequence()
                .filter { position -> position !in assignments }
                .filter { position ->
                    orthogonalNeighbors(position, boardSize).any { neighbor ->
                        cellBelongsToColor(neighbor, color)
                    }
                }
                .minWithOrNull(
                    compareBy<Position>(
                        { position ->
                            -orthogonalNeighbors(position, boardSize).count { neighbor ->
                                cellBelongsToColor(neighbor, color)
                            }
                        },
                        { position -> position.row },
                        { position -> position.col },
                    ),
                )
        }

        while (true) {
            val deficits =
                orderedColors
                    .map { color ->
                        color to (minimumGroupSize - (colorCounts[color] ?: 0))
                    }
                    .filter { (_, deficit) -> deficit > 0 }
            if (deficits.isEmpty()) break

            var madeProgress = false
            val colorsByNeed =
                deficits
                    .sortedWith(
                        compareByDescending<Pair<Char, Int>> { (_, deficit) -> deficit }
                            .thenBy { (color, _) -> color },
                    )
                    .map { (color, _) -> color }

            for (color in colorsByNeed) {
                val candidate = candidateForColor(color) ?: continue
                if (candidate !in blackoutSet) continue
                assignments[candidate] = color
                colorCounts[color] = (colorCounts[color] ?: 0) + 1
                madeProgress = true
            }

            if (!madeProgress) break
        }

        return assignments
            .entries
            .sortedWith(compareBy<Map.Entry<Position, Char>>({ it.key.row }, { it.key.col }))
            .map { (position, symbol) ->
                BlackoutFillOverride(
                    row = position.row,
                    col = position.col,
                    groupSymbol = symbol.toString(),
                )
            }
    }

    fun computeEffectiveMinGroupSize(
        layout: String,
        boardSize: Int,
        blackoutFillOverrides: List<BlackoutFillOverride>,
    ): Int {
        if (layout.length != boardSize * boardSize) return 0
        val groupCounts = linkedMapOf<String, Int>()
        for (symbol in layout) {
            if (symbol == '.') continue
            val key = symbol.toString()
            groupCounts[key] = (groupCounts[key] ?: 0) + 1
        }
        for (override in blackoutFillOverrides) {
            if (override.row !in 0 until boardSize || override.col !in 0 until boardSize) continue
            val index = override.row * boardSize + override.col
            if (layout[index] != '.') continue
            groupCounts[override.groupSymbol] = (groupCounts[override.groupSymbol] ?: 0) + 1
        }
        return groupCounts.values.minOrNull() ?: 0
    }

    fun describeMinGroupShortfall(
        layout: String,
        boardSize: Int,
        minimumGroupSize: Int,
        blackoutFillOverrides: List<BlackoutFillOverride>,
    ): String? {
        if (layout.length != boardSize * boardSize) return "Invalid layout encoding."

        val counts = linkedMapOf<Char, Int>()
        val blackoutSet = linkedSetOf<Position>()
        for (index in layout.indices) {
            val symbol = layout[index]
            if (symbol == '.') {
                blackoutSet += Position(index / boardSize, index % boardSize)
            } else {
                counts[symbol] = (counts[symbol] ?: 0) + 1
            }
        }
        for (override in blackoutFillOverrides) {
            if (override.row !in 0 until boardSize || override.col !in 0 until boardSize) continue
            val index = override.row * boardSize + override.col
            if (layout[index] != '.') continue
            val symbol = override.groupSymbol.firstOrNull() ?: continue
            counts[symbol] = (counts[symbol] ?: 0) + 1
        }

        val short = counts.filterValues { it < minimumGroupSize }
        if (short.isEmpty()) return null

        val details =
            short.entries
                .sortedBy { it.key }
                .take(4)
                .joinToString("; ") { (symbol, sizeNow) ->
                    val reachableBlackouts =
                        reachableBlackoutCountForColor(
                            layout = layout,
                            boardSize = boardSize,
                            blackoutSet = blackoutSet,
                            colorSymbol = symbol,
                        )
                    val theoreticalMax = counts.getValue(symbol) + reachableBlackouts
                    if (theoreticalMax < minimumGroupSize) {
                        "$symbol: size=$sizeNow, maxReachable=$theoreticalMax (isolated from enough blackout cells)"
                    } else {
                        "$symbol: size=$sizeNow, maxReachable=$theoreticalMax (assignment pressure)"
                    }
                }
        return "Short groups below minimum $minimumGroupSize: $details"
    }

    private fun reachableBlackoutCountForColor(
        layout: String,
        boardSize: Int,
        blackoutSet: Set<Position>,
        colorSymbol: Char,
    ): Int {
        val colorCells =
            layout.indices
                .asSequence()
                .filter { index -> layout[index] == colorSymbol }
                .map { index -> Position(index / boardSize, index % boardSize) }
                .toList()
        if (colorCells.isEmpty()) return 0

        val queue = ArrayDeque<Position>()
        val visitedBlackouts = linkedSetOf<Position>()
        val visited = mutableSetOf<Position>()
        colorCells.forEach { cell ->
            queue.add(cell)
            visited += cell
        }

        while (queue.isNotEmpty()) {
            val current = queue.removeFirst()
            for (neighbor in orthogonalNeighbors(current, boardSize)) {
                if (neighbor in visited) continue
                val index = neighbor.row * boardSize + neighbor.col
                if (layout[index] == colorSymbol || neighbor in blackoutSet) {
                    visited += neighbor
                    queue.add(neighbor)
                    if (neighbor in blackoutSet) {
                        visitedBlackouts += neighbor
                    }
                }
            }
        }

        return visitedBlackouts.size
    }

    fun computeOutgoingFingerprints(queenPositions: Collection<Position>): OutgoingFingerprintPair {
        val ruleset =
            QueensRuleset(
                orthogonalMinDistance = ORTHOGONAL_MIN_DISTANCE,
                forbidDiagonalTouch = true,
                requireRowCoverage = false,
                requireColumnCoverage = false,
            )
        val queens = queenPositions.toList()
        return OutgoingFingerprintPair(
            rightSignature = computeHorizontalBleed(queens, ruleset),
            bottomSignature = computeVerticalBleed(queens, ruleset),
        )
    }

    fun decodeQueenPositions(queens: String, size: Int = BASE_SIZE): Set<Position> {
        require(queens.length == size * size) { "Queens encoding must match board size." }
        return queens.mapIndexedNotNull { index, cell ->
            if (cell == 'Q') Position(index / size, index % size) else null
        }.toSet()
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
            blackoutPositions = emptySet(),
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
     * If [allowTargetFallbackToMax] is false, generation fails loudly when the requested target
     * is above the best achievable placement. Catalog generation can opt in to fallback so the
     * saved piece records the actual max queen count for that fingerprint.
     */
    private fun buildIrregularQuadrant(
        pieceKind: String,
        groupPrefix: String,
        leftBlackoutSignature: List<Int>,
        topBlackoutSignature: List<Int>,
        ruleset: QueensRuleset,
        targetQueenCount: Int = DEPENDENT_TARGET_QUEEN_COUNT,
        allowTargetFallbackToMax: Boolean = false,
        randomSeed: Long? = null,
        minimumGroupSizeForGeneration: Int = MINIMUM_GROUP_SIZE,
    ): QuadrantPiece {
        validateSignatures(leftBlackoutSignature, topBlackoutSignature)
        val signatureBlackoutPositions = blackoutPositionsFor(leftBlackoutSignature, topBlackoutSignature)
        val activePositions =
            (0 until BASE_SIZE).flatMap { row ->
                (0 until BASE_SIZE).mapNotNull { col ->
                    val p = Position(row, col)
                    if (p !in signatureBlackoutPositions) p else null
                }
            }
        val maxPlacement = resolveMaxPlacement(activePositions, ruleset)
        val effectiveTarget = minOf(targetQueenCount, maxPlacement.queenCount)
        if (effectiveTarget < targetQueenCount) {
            logger.info(
                "Capping target for $pieceKind from $targetQueenCount to $effectiveTarget " +
                    "(blackout reduces active cells to ${activePositions.size}, max achievable queens = ${maxPlacement.queenCount})",
            )
        }
        val generationResult =
            generationWorkflowService.generateValidBoard(
                size = BASE_SIZE,
                queenCountMode = "exact",
                targetQueenCount = effectiveTarget,
                orthogonalMinDistance = ORTHOGONAL_MIN_DISTANCE,
                minimumGroupSize = minimumGroupSizeForGeneration,
                generationStrategy = GENERATION_STRATEGY,
                blackoutPositions = signatureBlackoutPositions,
            )
        if (!generationResult.success) {
            val quadrantLabel =
                when (pieceKind) {
                    "TOP_RIGHT" -> "Top-Right"
                    "BOTTOM_LEFT" -> "Bottom-Left"
                    "BOTTOM_RIGHT" -> "Bottom-Right"
                    else -> pieceKind
                }
            throw IllegalStateException(
                "$quadrantLabel generation failed: the blackout shape could not produce target $effectiveTarget " +
                    "(requested $targetQueenCount, capped to max achievable $effectiveTarget). " +
                    "Left signature: [${leftBlackoutSignature.joinToString()}], " +
                    "Top signature: [${topBlackoutSignature.joinToString()}]",
            )
        }
        val generatedBoard = requireNotNull(generationResult.boardState) {
            "$pieceKind generation returned success=true but null boardState."
        }
        val queens =
            generatedBoard.cells.flatten()
                .filter { it.isSolutionQueen }
                .map { it.position }
                .toSet()
        val effectiveBlackoutPositions =
            generatedBoard.cells.flatten()
                .filter { it.isBlackout }
                .map { it.position }
                .toSet()
        val groups = renameBoardGroups(generatedBoard, groupPrefix)
        val groupSlots = slotMapFor(groups.values)

        return QuadrantPiece(
            pieceKind = pieceKind,
            groupPrefix = groupPrefix,
            queenCount = queens.size,
            targetQueenCount = effectiveTarget,
            blackoutCellCount = effectiveBlackoutPositions.size,
            leftBlackoutSignature = leftBlackoutSignature,
            topBlackoutSignature = topBlackoutSignature,
            blackoutPositions = effectiveBlackoutPositions,
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
                                    blackoutPositions = effectiveBlackoutPositions,
                                )
                            }
                        },
                ),
        )
    }

    private fun buildVerticalStitchedBoard(chunks: List<QuadrantPiece>): StitchingPreviewBoardDto {
        require(chunks.isNotEmpty()) { "At least one vertical stitching chunk is required." }
        val cells = mutableMapOf<Position, FinalCell>()
        val boardWidth = BASE_SIZE
        val boardHeight = BASE_SIZE * chunks.size
        val randomSeed =
            chunks
                .flatMap { it.leftBlackoutSignature + it.topBlackoutSignature }
                .sum() + chunks.sumOf { it.queenCount }
        val random = Random(randomSeed)

        chunks.forEachIndexed { chunkIndex, chunk ->
            val rowOffset = chunkIndex * BASE_SIZE
            for (row in 0 until BASE_SIZE) {
                for (col in 0 until BASE_SIZE) {
                    val local = Position(row, col)
                    val global = Position(row + rowOffset, col)
                    if (local in chunk.blackoutPositions) {
                        cells[global] = FinalCell(wasBlackout = true)
                        continue
                    }

                    cells[global] =
                        FinalCell(
                            groupId = chunk.activeGroups[local],
                            queen = local in chunk.queenPositions,
                        )
                }
            }
        }

        val unresolved = cells.filterValues { it.wasBlackout }.keys.toMutableSet()
        while (unresolved.isNotEmpty()) {
            var progress = false
            val toResolve = unresolved.toList()
            for (position in toResolve) {
                val adjacentGroups =
                    orthogonalNeighbors(position, boardHeight, boardWidth)
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
                "Unable to resolve vertical stitched blackout cells into adjacent color groups."
            }
        }

        val groupSlots = slotMapFor(cells.values.mapNotNull { it.groupId })
        return StitchingPreviewBoardDto(
            width = boardWidth,
            height = boardHeight,
            cells =
                (0 until boardHeight).map { row ->
                    (0 until boardWidth).map { col ->
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
        random: Random? = null,
    ): Map<Position, String> {
        if (queens.isEmpty()) return emptyMap()

        val sortedQueens = queens.sortedWith(compareBy<Position>({ it.row }, { it.col }))
        val groupIds =
            sortedQueens.withIndex().associate { (index, position) ->
                position to "$groupPrefix-g${(index + 1).toString().padStart(2, '0')}"
            }

        val activeSet = activePositions.toHashSet()
        val result = mutableMapOf<Position, String>()
        val queue = ArrayDeque<Position>()

        // Seed BFS from all queens simultaneously, in random order so no queen gets a
        // systematic head-start in claiming adjacent territory.
        val seedOrder = if (random != null) sortedQueens.shuffled(random) else sortedQueens
        seedOrder.forEach { queen ->
            result[queen] = groupIds[queen]!!
            queue.add(queen)
        }

        // BFS flood-fill: all frontiers advance one step at a time, producing roughly
        // equal-sized regions instead of the large/tiny split that Voronoi gives.
        val adjacentDeltas = listOf(Position(-1, 0), Position(1, 0), Position(0, -1), Position(0, 1))
        while (queue.isNotEmpty()) {
            val current = queue.removeFirst()
            val groupId = result[current]!!
            val neighbours = adjacentDeltas.map { d -> Position(current.row + d.row, current.col + d.col) }
            val candidates = neighbours.filter { it in activeSet && it !in result }
            val ordered = if (random != null) candidates.shuffled(random) else candidates
            ordered.forEach { neighbour ->
                result[neighbour] = groupId
                queue.add(neighbour)
            }
        }

        // Fallback for cells unreachable by BFS (disconnected blackout shapes): assign
        // to nearest queen by Manhattan distance.
        activePositions.forEach { position ->
            if (position !in result) {
                val nearest = sortedQueens.minByOrNull { manhattanDistance(position, it) }!!
                result[position] = groupIds[nearest]!!
            }
        }

        return result
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

    private fun encodeQuadrant(quadrant: QuadrantPiece): Pair<String, String> {
        val groupSymbols = linkedMapOf<String, Char>()
        var nextSymbolCode = '0'.code
        val layout = StringBuilder(BASE_SIZE * BASE_SIZE)
        val queens = StringBuilder(BASE_SIZE * BASE_SIZE)
        val blackoutPositions = quadrant.blackoutPositions

        for (row in 0 until BASE_SIZE) {
            for (col in 0 until BASE_SIZE) {
                val position = Position(row, col)
                if (position in blackoutPositions) {
                    layout.append('.')
                    queens.append('.')
                    continue
                }

                val groupId = requireNotNull(quadrant.activeGroups[position]) {
                    "Missing group assignment for active stitching cell at ($row, $col)."
                }
                val symbol =
                    groupSymbols.getOrPut(groupId) {
                        val resolved = nextSymbolCode.toChar()
                        nextSymbolCode += 1
                        resolved
                    }
                layout.append(symbol)
                queens.append(if (position in quadrant.queenPositions) 'Q' else '.')
            }
        }

        return layout.toString() to queens.toString()
    }

    private fun orthogonalNeighbors(position: Position, boardSize: Int): List<Position> =
        orthogonalNeighbors(position, boardHeight = boardSize, boardWidth = boardSize)

    private fun orthogonalNeighbors(
        position: Position,
        boardHeight: Int,
        boardWidth: Int,
    ): List<Position> =
        listOf(
            Position(position.row - 1, position.col),
            Position(position.row + 1, position.col),
            Position(position.row, position.col - 1),
            Position(position.row, position.col + 1),
        ).filter { candidate ->
            candidate.row in 0 until boardHeight && candidate.col in 0 until boardWidth
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
        random: Random? = null,
    ): PlacementResult {
        val candidateOrder = if (random != null) activePositions.shuffled(random) else activePositions
        val placed = mutableListOf<Position>()
        var best = emptyList<Position>()

        fun backtrack(startIndex: Int) {
            if (placed.size > best.size) {
                best = placed.toList()
            }
            if (startIndex >= activePositions.size) {
                return
            }
            if (placed.size + (candidateOrder.size - startIndex) <= best.size) {
                return
            }

            for (index in startIndex until candidateOrder.size) {
                val candidate = candidateOrder[index]
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

    private fun QuadrantPiece.toDto(): StitchingPreviewChunkDto =
        StitchingPreviewChunkDto(
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
