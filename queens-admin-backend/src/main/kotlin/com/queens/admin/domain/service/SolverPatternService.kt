package com.queens.admin.domain.service

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.ChangedCell
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.Position
import org.springframework.stereotype.Service

@Service
class SolverPatternService(
    private val solverSupportService: DeterministicSolverSupportService,
) {
    data class SolverPatternCell(
        val row: Int,
        val col: Int,
        val activeSquare: Boolean = false,
    )

    data class SolverPatternOffset(
        val row: Int,
        val col: Int,
    )

    data class SolverPatternDefinition(
        val id: String? = null,
        val size: Int,
        val cells: List<SolverPatternCell>,
        val outputFlags: List<SolverPatternOffset>,
    )

    private data class PatternVariant(
        val activeCells: List<Position>,
        val activeWindowCells: Set<String>,
        val activeWindowOrigin: Position,
        val activeWindowHeight: Int,
        val activeWindowWidth: Int,
        val outputFlags: List<Position>,
    )

    fun applyPattern(boardState: BoardState, pattern: SolverPatternDefinition): Pair<BoardState, List<ChangedCell>> {
        val placements = collectPatternFlagPlacements(boardState, pattern)
        var updatedBoard = boardState
        val changedCells = mutableListOf<ChangedCell>()

        for (placement in placements) {
            val (nextBoard, nextChanges) =
                solverSupportService.placeFlag(
                    boardState = updatedBoard,
                    row = placement.row,
                    col = placement.col,
                    explanation = "flagged by solver pattern",
                    changeType = "SOLVER_PATTERN_FLAG",
                )
            updatedBoard = nextBoard
            changedCells += nextChanges
        }

        return updatedBoard to changedCells
    }

    private fun collectPatternFlagPlacements(
        boardState: BoardState,
        pattern: SolverPatternDefinition,
    ): List<Position> {
        val placements = mutableListOf<Position>()
        val seen = mutableSetOf<String>()
        val gridSize = boardState.size
        val variants = patternVariants(pattern)

        for (variant in variants) {
            for (baseRow in 0..(gridSize - variant.activeWindowHeight)) {
                for (baseCol in 0..(gridSize - variant.activeWindowWidth)) {
                    if (!hasRequiredStructureAt(boardState, baseRow, baseCol, variant)) continue

                    for (output in variant.outputFlags) {
                        val row = baseRow + (output.row - variant.activeWindowOrigin.row)
                        val col = baseCol + (output.col - variant.activeWindowOrigin.col)

                        if (row !in 0 until gridSize || col !in 0 until gridSize) continue
                        if (boardState.cells[row][col].markType != MarkType.NONE) continue

                        val key = keyForCell(row, col)
                        if (!seen.add(key)) continue

                        placements += Position(row, col)
                    }
                }
            }
        }

        return placements
    }

    private fun patternVariants(pattern: SolverPatternDefinition): List<PatternVariant> {
        val activeCells = pattern.cells
            .filter { it.activeSquare }
            .map { Position(it.row, it.col) }
        if (activeCells.isEmpty()) return emptyList()

        val variants = linkedMapOf<String, PatternVariant>()

        for (flipMode in listOf("none", "horizontal", "vertical")) {
            for (rotationsCW in 0..3) {
                val variant = buildVariant(pattern, activeCells, rotationsCW, flipMode)
                val signature = buildVariantSignature(variant.activeCells, variant.outputFlags)
                variants.putIfAbsent(signature, variant)
            }
        }

        return variants.values.toList()
    }

    private fun buildVariant(
        pattern: SolverPatternDefinition,
        activeCells: List<Position>,
        rotationsCW: Int,
        flipMode: String,
    ): PatternVariant {
        val transformedActive = activeCells.map { transformCoord(it, pattern.size, rotationsCW, flipMode) }
        val transformedFlags = pattern.outputFlags.map {
            transformCoord(Position(it.row, it.col), pattern.size, rotationsCW, flipMode)
        }
        val sortedActive = sortedPositions(transformedActive)
        val minRow = sortedActive.minOf { it.row }
        val maxRow = sortedActive.maxOf { it.row }
        val minCol = sortedActive.minOf { it.col }
        val maxCol = sortedActive.maxOf { it.col }
        val origin = Position(minRow, minCol)

        return PatternVariant(
            activeCells = sortedActive,
            activeWindowCells = sortedActive
                .map { keyForCell(it.row - minRow, it.col - minCol) }
                .toSet(),
            activeWindowOrigin = origin,
            activeWindowHeight = maxRow - minRow + 1,
            activeWindowWidth = maxCol - minCol + 1,
            outputFlags = sortedPositions(transformedFlags),
        )
    }

    private fun hasRequiredStructureAt(
        boardState: BoardState,
        baseRow: Int,
        baseCol: Int,
        variant: PatternVariant,
    ): Boolean {
        if (variant.activeCells.isEmpty()) return false

        val anchor = variant.activeCells.first()
        val anchorRow = anchor.row - variant.activeWindowOrigin.row
        val anchorCol = anchor.col - variant.activeWindowOrigin.col
        val anchorSquare = boardState.cells.getOrNull(baseRow + anchorRow)?.getOrNull(baseCol + anchorCol)
        val focusColor = anchorSquare?.groupColor ?: return false

        val absoluteActiveCells = variant.activeCells.map { cell ->
            Position(
                row = baseRow + (cell.row - variant.activeWindowOrigin.row),
                col = baseCol + (cell.col - variant.activeWindowOrigin.col),
            )
        }
        val absoluteActiveSet = absoluteActiveCells.map { keyForCell(it.row, it.col) }.toSet()

        for (relRow in 0 until variant.activeWindowHeight) {
            for (relCol in 0 until variant.activeWindowWidth) {
                val square = boardState.cells.getOrNull(baseRow + relRow)?.getOrNull(baseCol + relCol)
                val isActive = variant.activeWindowCells.contains(keyForCell(relRow, relCol))
                if (isActive && square?.groupColor != focusColor) {
                    return false
                }
            }
        }

        for (row in boardState.cells.indices) {
            for (col in boardState.cells[row].indices) {
                if (boardState.cells[row][col].groupColor != focusColor) continue

                val key = keyForCell(row, col)
                val isActiveCell = absoluteActiveSet.contains(key)
                val isUnmarked = boardState.cells[row][col].markType == MarkType.NONE

                if (isActiveCell && !isUnmarked) return false
                if (!isActiveCell && isUnmarked) return false
            }
        }

        return true
    }

    private fun keyForCell(row: Int, col: Int): String = "$row,$col"

    private fun buildVariantSignature(activeCells: List<Position>, outputFlags: List<Position>): String =
        "A:${serializePositions(activeCells)};F:${serializePositions(outputFlags)}"

    private fun serializePositions(positions: List<Position>): String =
        sortedPositions(positions).joinToString("|") { position -> keyForCell(position.row, position.col) }

    private fun sortedPositions(positions: List<Position>): List<Position> =
        positions.sortedWith(compareBy<Position>({ it.row }, { it.col }))

    private fun transformCoord(position: Position, size: Int, rotationsCW: Int, flipMode: String): Position {
        val rotated =
            when (rotationsCW % 4) {
                0 -> position
                1 -> Position(row = position.col, col = size - 1 - position.row)
                2 -> Position(row = size - 1 - position.row, col = size - 1 - position.col)
                else -> Position(row = size - 1 - position.col, col = position.row)
            }

        return when (flipMode) {
            "horizontal" -> Position(row = rotated.row, col = size - 1 - rotated.col)
            "vertical" -> Position(row = size - 1 - rotated.row, col = rotated.col)
            else -> rotated
        }
    }
}
