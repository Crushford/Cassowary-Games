package com.queens.admin.application

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.PersistedPuzzle
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.model.PuzzleDifficultyTier
import com.queens.admin.domain.service.PersistedPuzzleBoardCodecService
import kotlin.math.abs
import org.springframework.stereotype.Service

@Service
class PuzzleDifficultyAssessmentService(
    private val persistedPuzzleBoardCodecService: PersistedPuzzleBoardCodecService,
) {
    companion object {
        const val SOLVER_VERSION = "difficulty-v1"
    }

    data class AssessmentResult(
        val puzzleId: java.util.UUID,
        val difficultyTier: PuzzleDifficultyTier,
        val difficultyScore: Int,
        val loops: Int,
        val hardBranchCount: Int,
        val finalQueensPlaced: Int,
        val unresolvedSquares: Int,
    )

    fun assess(puzzle: PersistedPuzzle): AssessmentResult {
        val boardState = persistedPuzzleBoardCodecService.decode(puzzle)
        val state = SolverState(boardState)
        val solved = solveRecursively(state)
        require(solved) {
            "Difficulty assessor could not solve puzzle ${puzzle.id} (size ${puzzle.size})."
        }
        require(isSolved(state)) {
            "Difficulty assessor reached a non-terminal state for puzzle ${puzzle.id}."
        }

        val tier =
            when {
                state.hardUsed -> PuzzleDifficultyTier.HARD
                state.mediumUsed -> PuzzleDifficultyTier.MEDIUM
                else -> PuzzleDifficultyTier.EASY
            }

        return AssessmentResult(
            puzzleId = puzzle.id,
            difficultyTier = tier,
            difficultyScore = tier.score,
            loops = state.loopCount,
            hardBranchCount = state.hardBranchCount,
            finalQueensPlaced = countQueens(state.marks),
            unresolvedSquares = countUnresolved(state),
        )
    }

    private data class SolverState(
        val board: BoardState,
        val marks: MutableList<MutableList<MarkType>> = MutableList(board.size) {
            MutableList(board.size) { MarkType.NONE }
        },
        var loopCount: Int = 0,
        var mediumUsed: Boolean = false,
        var hardUsed: Boolean = false,
        var hardBranchCount: Int = 0,
    )

    private fun solveRecursively(state: SolverState): Boolean {
        applyDeterministicPasses(state)
        if (hasContradiction(state)) {
            return false
        }
        if (isSolved(state)) {
            return true
        }

        val branchCell = chooseBranchCell(state) ?: return false
        state.hardUsed = true
        state.hardBranchCount += 1

        val queenBranch = state.deepCopy()
        placeQueen(queenBranch, branchCell.row, branchCell.col)
        if (solveRecursively(queenBranch)) {
            state.restoreFrom(queenBranch)
            return true
        }

        val flagBranch = state.deepCopy()
        placeFlag(flagBranch, branchCell.row, branchCell.col)
        if (solveRecursively(flagBranch)) {
            state.restoreFrom(flagBranch)
            return true
        }

        return false
    }

    private fun applyDeterministicPasses(state: SolverState) {
        while (true) {
            state.loopCount += 1
            var changed = false

            while (true) {
                val easyBefore = countMarkedSquares(state)
                flagBlockingSquares(state)
                placeLastFreeQueens(state)
                if (countMarkedSquares(state) == easyBefore) {
                    break
                }
                changed = true
                if (hasContradiction(state) || isSolved(state)) {
                    return
                }
            }

            val mediumBefore = countMarkedSquares(state)
            eliminateConstrainedRows(state)
            eliminateConstrainedColumns(state)
            placeLastFreeQueens(state)
            if (countMarkedSquares(state) != mediumBefore) {
                state.mediumUsed = true
                changed = true
                if (hasContradiction(state) || isSolved(state)) {
                    return
                }
                continue
            }

            if (!changed) {
                return
            }
        }
    }

    private fun flagBlockingSquares(state: SolverState) {
        val size = state.board.size
        for (row in 0 until size) {
            for (col in 0 until size) {
                if (state.marks[row][col] != MarkType.NONE) continue
                if (!isCandidateCell(state, row, col)) {
                    placeFlag(state, row, col)
                    continue
                }

                val simulated = state.deepCopy()
                placeQueen(simulated, row, col)
                if (hasContradiction(simulated)) {
                    placeFlag(state, row, col)
                }
            }
        }
    }

    private fun placeLastFreeQueens(state: SolverState) {
        while (true) {
            var changed = false
            groupedPositions(state).values.forEach { positions ->
                val candidates = positions.filter { position -> isCandidateCell(state, position.row, position.col) }
                if (candidates.size == 1) {
                    changed = placeQueen(state, candidates.single().row, candidates.single().col) || changed
                }
            }

            for (row in 0 until state.board.size) {
                val candidates = (0 until state.board.size).filter { col -> isCandidateCell(state, row, col) }
                if (candidates.size == 1) {
                    changed = placeQueen(state, row, candidates.single()) || changed
                }
            }

            for (col in 0 until state.board.size) {
                val candidates = (0 until state.board.size).filter { row -> isCandidateCell(state, row, col) }
                if (candidates.size == 1) {
                    changed = placeQueen(state, candidates.single(), col) || changed
                }
            }

            if (!changed) {
                return
            }
            if (hasContradiction(state)) {
                return
            }
        }
    }

    private fun eliminateConstrainedRows(state: SolverState) {
        eliminateConstrainedLines(state, isColumn = false)
    }

    private fun eliminateConstrainedColumns(state: SolverState) {
        eliminateConstrainedLines(state, isColumn = true)
    }

    private fun eliminateConstrainedLines(state: SolverState, isColumn: Boolean) {
        val size = state.board.size
        val colorToAxisMap = linkedMapOf<String, MutableSet<Int>>()

        for (row in 0 until size) {
            for (col in 0 until size) {
                if (!isCandidateCell(state, row, col)) continue
                val color = state.board.cells[row][col].groupColor ?: continue
                val coordinate = if (isColumn) col else row
                colorToAxisMap.getOrPut(color) { linkedSetOf() }.add(coordinate)
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
                    if (state.marks[row][col] != MarkType.NONE) continue
                    val squareColor = state.board.cells[row][col].groupColor
                    val isOutsideAllowedColors = squareColor == null || squareColor !in allowedColors
                    if (isOutsideAllowedColors) {
                        placeFlag(state, row, col)
                    }
                }
            }
        }
    }

    private fun placeQueen(state: SolverState, row: Int, col: Int): Boolean {
        if (state.marks[row][col] == MarkType.QUEEN) return false
        state.marks[row][col] = MarkType.QUEEN
        var changed = true
        for (candidateRow in 0 until state.board.size) {
            for (candidateCol in 0 until state.board.size) {
                if (state.marks[candidateRow][candidateCol] == MarkType.NONE &&
                    !isValidMoveWithMarks(candidateRow, candidateCol, state.marks, state.board)
                ) {
                    placeFlag(state, candidateRow, candidateCol)
                }
            }
        }
        return changed
    }

    private fun placeFlag(state: SolverState, row: Int, col: Int): Boolean {
        if (state.marks[row][col] == MarkType.FLAG) return false
        state.marks[row][col] = MarkType.FLAG
        return true
    }

    private fun chooseBranchCell(state: SolverState): Position? {
        val candidateCells = mutableListOf<Position>()
        for (row in 0 until state.board.size) {
            for (col in 0 until state.board.size) {
                if (isCandidateCell(state, row, col)) {
                    candidateCells += Position(row, col)
                }
            }
        }

        return candidateCells.minByOrNull { position ->
            val rowCandidates = (0 until state.board.size).count { col -> isCandidateCell(state, position.row, col) }
            val colCandidates = (0 until state.board.size).count { row -> isCandidateCell(state, row, position.col) }
            val groupCandidates =
                groupedPositions(state)[state.board.cells[position.row][position.col].groupColor]
                    .orEmpty()
                    .count { candidate -> isCandidateCell(state, candidate.row, candidate.col) }
            rowCandidates + colCandidates + groupCandidates
        }
    }

    private fun hasContradiction(state: SolverState): Boolean {
        val size = state.board.size
        if (countQueens(state.marks) > size) return true

        for (row in 0 until size) {
            val rowQueens = (0 until size).count { col -> state.marks[row][col] == MarkType.QUEEN }
            if (rowQueens > 1) return true
            if ((0 until size).none { col -> isCandidateCell(state, row, col) }) return true
        }

        for (col in 0 until size) {
            val colQueens = (0 until size).count { row -> state.marks[row][col] == MarkType.QUEEN }
            if (colQueens > 1) return true
            if ((0 until size).none { row -> isCandidateCell(state, row, col) }) return true
        }

        groupedPositions(state).values.forEach { positions ->
            val queenCount = positions.count { position -> state.marks[position.row][position.col] == MarkType.QUEEN }
            if (queenCount > 1) return true
            if (positions.none { position -> isCandidateCell(state, position.row, position.col) }) return true
        }

        return false
    }

    private fun isSolved(state: SolverState): Boolean {
        if (hasContradiction(state)) return false
        if (countQueens(state.marks) != state.board.size) return false

        for (row in 0 until state.board.size) {
            if ((0 until state.board.size).count { col -> state.marks[row][col] == MarkType.QUEEN } != 1) return false
        }
        for (col in 0 until state.board.size) {
            if ((0 until state.board.size).count { row -> state.marks[row][col] == MarkType.QUEEN } != 1) return false
        }

        return groupedPositions(state).values.all { positions ->
            positions.count { position -> state.marks[position.row][position.col] == MarkType.QUEEN } == 1
        }
    }

    private fun countUnresolved(state: SolverState): Int =
        state.marks.sumOf { row -> row.count { mark -> mark == MarkType.NONE } }

    private fun countMarkedSquares(state: SolverState): Int =
        state.marks.sumOf { row -> row.count { mark -> mark != MarkType.NONE } }

    private fun countQueens(marks: List<List<MarkType>>): Int =
        marks.sumOf { row -> row.count { mark -> mark == MarkType.QUEEN } }

    private fun groupedPositions(state: SolverState): Map<String, List<Position>> =
        state.board.cells.flatten()
            .filter { cell -> cell.groupColor != null }
            .groupBy({ cell -> cell.groupColor!! }, { cell -> cell.position })

    private fun isCandidateCell(state: SolverState, row: Int, col: Int): Boolean {
        return when (state.marks[row][col]) {
            MarkType.FLAG, MarkType.INVALID -> false
            MarkType.QUEEN -> true
            MarkType.NONE -> isValidMoveWithMarks(row, col, state.marks, state.board)
        }
    }

    private fun isValidMoveWithMarks(
        row: Int,
        col: Int,
        marks: List<List<MarkType>>,
        boardState: BoardState,
    ): Boolean {
        val currentMark = marks[row][col]
        if (currentMark == MarkType.FLAG || currentMark == MarkType.INVALID) return false

        val size = boardState.size
        for (index in 0 until size) {
            if (index != col && marks[row][index] == MarkType.QUEEN) return false
            if (index != row && marks[index][col] == MarkType.QUEEN) return false
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

        val squareColor = boardState.cells[row][col].groupColor ?: return false
        for (candidateRow in 0 until size) {
            for (candidateCol in 0 until size) {
                if ((candidateRow != row || candidateCol != col) &&
                    marks[candidateRow][candidateCol] == MarkType.QUEEN &&
                    boardState.cells[candidateRow][candidateCol].groupColor == squareColor
                ) {
                    return false
                }
            }
        }

        return true
    }

    private fun SolverState.deepCopy(): SolverState =
        SolverState(
            board = board,
            marks = marks.map { row -> row.toMutableList() }.toMutableList(),
            loopCount = loopCount,
            mediumUsed = mediumUsed,
            hardUsed = hardUsed,
            hardBranchCount = hardBranchCount,
        )

    private fun SolverState.restoreFrom(source: SolverState) {
        loopCount = source.loopCount
        mediumUsed = source.mediumUsed
        hardUsed = source.hardUsed
        hardBranchCount = source.hardBranchCount
        for (row in marks.indices) {
            for (col in marks[row].indices) {
                marks[row][col] = source.marks[row][col]
            }
        }
    }
}
