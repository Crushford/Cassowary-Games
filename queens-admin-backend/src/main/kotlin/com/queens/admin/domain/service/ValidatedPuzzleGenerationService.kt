package com.queens.admin.domain.service

import com.queens.admin.domain.model.ActionType
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.CellState
import com.queens.admin.domain.model.ChangedCell
import com.queens.admin.domain.model.GenerationPhase
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.OperationResult
import com.queens.admin.domain.model.Position
import org.springframework.stereotype.Service
import kotlin.math.abs
import kotlin.random.Random

@Service
class ValidatedPuzzleGenerationService(
    private val boardFactoryService: BoardFactoryService,
    private val boardValidationService: BoardValidationService,
) {
    private val colorPalette = listOf("red", "blue", "green", "yellow", "purple", "pink", "teal", "indigo", "amber")

    fun generateValidBoard(size: Int, maxRetries: Int = 30_000): OperationResult {
        require(size in 4..9) { "Generation currently supports puzzle sizes 4 through 9." }

        repeat(maxRetries) {
            val state = GeneratorState(
                grid = boardFactoryService.createEmptyBoard(size),
                autoTestMarks = createEmptyMarks(size),
            )

            try {
                placeAllQueens(state, size)
                validateQueenCount(state.grid, size)

                assignInitialColorsToState(state)
                validateUniqueQueenColors(state.grid, size)
                if (!isSolvable(state)) {
                    error("Board is not fully solvable after initial colors")
                }

                if (!expandColorGridSafely(state) || !validateGroupSizes(state.grid, 2)) {
                    return@repeat
                }
                if (!isSolvable(state)) {
                    error("Board is not fully solvable after first color expansion")
                }

                if (!expandColorGridSafely(state) || !validateGroupSizes(state.grid, 3)) {
                    return@repeat
                }
                if (!isSolvable(state)) {
                    error("Board is not fully solvable after second color expansion")
                }

                expandIntoBlockedSquares(state)
                validateSolvableAndFull(state)

                val validation = boardValidationService.validate(state.grid)
                return OperationResult(
                    success = true,
                    actionType = ActionType.GENERATE_VALID_BOARD,
                    explanation = "Generated a solvable board for size $size using the validated generation workflow.",
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
            } catch (_: Throwable) {
                // Retry with a fresh board, matching the TS generator's retry behavior.
            }
        }

        val emptyBoard = boardFactoryService.createEmptyBoard(size)
        val validation = boardValidationService.validate(emptyBoard)
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

    fun isBoardSolvable(boardState: BoardState): Boolean {
        return isSolvable(
            GeneratorState(
                grid = boardState,
                autoTestMarks = createEmptyMarks(boardState.size),
            ),
        )
    }

    private data class GeneratorState(
        var grid: BoardState,
        var autoTestMarks: MutableList<MutableList<MarkType>>,
    )

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
    ): Boolean {
        val size = boardState.size

        for (index in 0 until size) {
            if (marks[row][index] == MarkType.QUEEN || marks[index][col] == MarkType.QUEEN) {
                return false
            }
        }

        val diagonalPositions = listOf(
            row - 1 to col - 1,
            row - 1 to col + 1,
            row + 1 to col - 1,
            row + 1 to col + 1,
        )

        for ((candidateRow, candidateCol) in diagonalPositions) {
            if (candidateRow in 0 until size &&
                candidateCol in 0 until size &&
                marks[candidateRow][candidateCol] == MarkType.QUEEN
            ) {
                return false
            }
        }

        val square = boardState.cells[row][col]
        val squareColor = square.groupColor ?: return true
        for (candidateRow in 0 until size) {
            for (candidateCol in 0 until size) {
                if (marks[candidateRow][candidateCol] == MarkType.QUEEN &&
                    boardState.cells[candidateRow][candidateCol].groupColor == squareColor
                ) {
                    return false
                }
            }
        }

        return true
    }

    private fun placeAllQueens(state: GeneratorState, size: Int) {
        val tempQueenMarks = createEmptyMarks(size)

        var attempts = 0
        val maxAttempts = 100
        var consecutiveFailures = 0
        val maxConsecutiveFailures = 5

        while (countQueens(tempQueenMarks) < size && attempts < maxAttempts) {
            attempts += 1
            val success = placeRandomQueens(tempQueenMarks, state.grid, size)
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
                    markType = if (isQueen) MarkType.QUEEN else MarkType.NONE,
                )
            }
        }
        state.grid = state.grid.copy(cells = finalCells, generationPhase = GenerationPhase.QUEENS_PLACED)

        if (countSolutionQueens(state.grid) != size) {
            error("Failed to place all $size queens")
        }
    }

    private fun placeRandomQueens(
        tempQueenMarks: MutableList<MutableList<MarkType>>,
        boardState: BoardState,
        size: Int,
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
                    if (tempQueenMarks[row][col] == MarkType.NONE &&
                        isValidMoveWithMarks(row, col, tempQueenMarks, boardState)
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
            if (queensPlaced == size) return true
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

        val palette = colorPalette.toMutableList()
        val updatedCells = state.grid.cells.mapIndexed { rowIndex, row ->
            row.mapIndexed { colIndex, cell ->
                if (cell.isSolutionQueen) {
                    cell.copy(groupColor = palette.removeLast())
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

    private fun expandColorGroupsInPlace(boardState: BoardState): BoardState {
        val random = Random.Default
        val cells = boardState.cells.map { row -> row.toMutableList() }.toMutableList()
        val byColor = linkedMapOf<String, MutableList<Position>>()

        for (row in cells.indices) {
            for (col in cells[row].indices) {
                val color = cells[row][col].groupColor ?: continue
                byColor.getOrPut(color) { mutableListOf() }.add(Position(row, col))
            }
        }

        for ((color, positions) in byColor) {
            val shuffledSources = positions.shuffled(random)
            var expanded = false

            for (source in shuffledSources) {
                val directions = listOf(
                    0 to -1,
                    0 to 1,
                    -1 to 0,
                    1 to 0,
                ).shuffled(random)

                for ((deltaRow, deltaCol) in directions) {
                    val targetRow = source.row + deltaRow
                    val targetCol = source.col + deltaCol
                    if (targetRow !in cells.indices || targetCol !in cells[targetRow].indices) continue
                    if (cells[targetRow][targetCol].groupColor != null) continue

                    cells[targetRow][targetCol] = cells[targetRow][targetCol].copy(groupColor = color)
                    expanded = true
                    break
                }

                if (expanded) break
            }
        }

        return boardState.copy(cells = cells.map { it.toList() })
    }

    private fun expandColorGridSafely(state: GeneratorState): Boolean {
        val backup = cloneBoard(state.grid)
        repeat(100) {
            state.grid = expandColorGroupsInPlace(state.grid)
            if (isSolvable(state)) {
                return true
            }
            state.grid = cloneBoard(backup)
        }
        return false
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

    private fun validateGroupSizes(boardState: BoardState, expectedSize: Int): Boolean {
        val counts = linkedMapOf<String, Int>()
        for (cell in boardState.cells.flatten()) {
            val color = cell.groupColor ?: continue
            counts[color] = (counts[color] ?: 0) + 1
        }
        return counts.values.all { count -> count == expectedSize }
    }

    private fun isSolvable(state: GeneratorState): Boolean {
        clearAutoTestMarks(state)
        runAllSolverSteps(state)
        return state.autoTestMarks.all { row ->
            row.all { mark -> mark == MarkType.FLAG || mark == MarkType.QUEEN }
        }
    }

    private fun validateSolvableAndFull(state: GeneratorState) {
        if (!isSolvable(state)) {
            error("Board is not fully solvable")
        }

        val validation = boardValidationService.validate(state.grid)
        val allColored = state.grid.cells.all { row -> row.all { cell -> cell.groupColor != null } }
        if (!validation.isValid || !allColored) {
            error("Board is not fully solvable and colored")
        }
    }

    private fun placeQueen(state: GeneratorState, row: Int, col: Int) {
        if (!state.grid.cells[row][col].isSolutionQueen) {
            state.autoTestMarks[row][col] = MarkType.INVALID
            error("Attempted to place queen at ($row, $col) but it's not a solution queen")
        }

        state.autoTestMarks[row][col] = MarkType.QUEEN
        for (candidateRow in 0 until state.grid.size) {
            for (candidateCol in 0 until state.grid.size) {
                if (state.autoTestMarks[candidateRow][candidateCol] == MarkType.NONE &&
                    !isValidMoveWithMarks(candidateRow, candidateCol, state.autoTestMarks, state.grid)
                ) {
                    placeFlag(state, candidateRow, candidateCol, "blocked by queen at ($row, $col)")
                }
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
                if (state.grid.cells[row][col].groupColor == null &&
                    state.autoTestMarks[row][col] == MarkType.NONE
                ) {
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

        for (row in 0 until size) {
            val unflagged = (0 until size).filter { col -> state.autoTestMarks[row][col] != MarkType.FLAG }
            if (unflagged.size == 1) {
                placeQueen(state, row, unflagged.single())
            }
        }

        for (col in 0 until size) {
            val unflagged = (0 until size).filter { row -> state.autoTestMarks[row][col] != MarkType.FLAG }
            if (unflagged.size == 1) {
                placeQueen(state, unflagged.single(), col)
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

                for (candidateRow in 0 until size) {
                    for (candidateCol in 0 until size) {
                        if (simulatedMarks[candidateRow][candidateCol] == MarkType.NONE &&
                            !isValidMoveWithMarks(candidateRow, candidateCol, simulatedMarks, state.grid)
                        ) {
                            simulatedMarks[candidateRow][candidateCol] = MarkType.FLAG
                        }
                    }
                }

                val rowFullyBlocked = (0 until size).any { candidateRow ->
                    simulatedMarks[candidateRow].all { mark -> mark == MarkType.FLAG }
                }
                val colFullyBlocked = (0 until size).any { candidateCol ->
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
        eliminateConstrainedLines(state, isColumn = false)
    }

    private fun eliminateConstrainedColumns(state: GeneratorState) {
        eliminateConstrainedLines(state, isColumn = true)
    }

    private fun eliminateConstrainedLines(state: GeneratorState, isColumn: Boolean) {
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

    private fun eliminateConstrainedLinesForExpansion(
        boardState: BoardState,
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

    private fun expandIntoBlockedSquares(state: GeneratorState) {
        clearAutoTestMarks(state)
        val failedAttempts = linkedSetOf<String>()
        val size = state.grid.size
        var keepExpanding = true
        var expansionCount = 0
        val maxExpansions = size * size

        while (keepExpanding && expansionCount < maxExpansions) {
            keepExpanding = false
            expansionCount += 1

            val blockedSquares = eliminateConstrainedLinesForExpansion(state.grid, false) +
                eliminateConstrainedLinesForExpansion(state.grid, true)

            val coloredSquares = state.grid.cells.flatten().count { cell -> cell.groupColor != null }
            if (coloredSquares == size * size) break

            for ((position, responsibleColors) in blockedSquares) {
                if (state.grid.cells[position.row][position.col].groupColor != null) continue
                val directions = listOf(
                    1 to 0,
                    -1 to 0,
                    0 to 1,
                    0 to -1,
                )
                for ((deltaRow, deltaCol) in directions) {
                    val neighborRow = position.row + deltaRow
                    val neighborCol = position.col + deltaCol
                    if (neighborRow !in 0 until size || neighborCol !in 0 until size) continue

                    val neighborColor = state.grid.cells[neighborRow][neighborCol].groupColor ?: continue
                    if (neighborColor in responsibleColors) continue

                    val attemptKey = "${position.row},${position.col},$neighborColor"
                    if (attemptKey in failedAttempts) continue

                    val originalColor = state.grid.cells[position.row][position.col].groupColor
                    state.grid = state.grid.copy(
                        cells = state.grid.cells.mapIndexed { rowIndex, row ->
                            row.mapIndexed { colIndex, cell ->
                                if (rowIndex == position.row && colIndex == position.col) {
                                    cell.copy(groupColor = neighborColor)
                                } else {
                                    cell
                                }
                            }
                        },
                    )

                    if (isSolvable(state)) {
                        keepExpanding = true
                        break
                    } else {
                        failedAttempts += attemptKey
                        state.grid = state.grid.copy(
                            cells = state.grid.cells.mapIndexed { rowIndex, row ->
                                row.mapIndexed { colIndex, cell ->
                                    if (rowIndex == position.row && colIndex == position.col) {
                                        cell.copy(groupColor = originalColor)
                                    } else {
                                        cell
                                    }
                                }
                            },
                        )
                    }
                }
            }
        }

        runAllSolverSteps(state)
    }
}
