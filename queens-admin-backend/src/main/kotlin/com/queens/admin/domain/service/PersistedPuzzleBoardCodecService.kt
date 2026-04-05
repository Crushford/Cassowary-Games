package com.queens.admin.domain.service

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.CellState
import com.queens.admin.domain.model.GenerationPhase
import com.queens.admin.domain.model.MarkType
import com.queens.admin.domain.model.PersistedPuzzle
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.model.QueensBoardMetadata
import kotlin.math.sqrt
import org.springframework.stereotype.Service
import java.util.Base64

@Service
class PersistedPuzzleBoardCodecService {
    fun decode(puzzle: PersistedPuzzle): BoardState =
        decode(
            layout = puzzle.layout,
            queens = puzzle.queens,
            metadata = QueensBoardMetadata.metadata(
                boardSize = puzzle.size,
                targetQueenCount = puzzle.targetQueenCount,
                orthogonalMinDistance = puzzle.orthogonalMinDistance,
            ),
        )

    fun decode(
        layout: String,
        queens: String,
        metadata: Map<String, String> = emptyMap(),
    ): BoardState {
        require(layout.length == queens.length) { "Layout and queens must be the same length." }
        val size = sqrt(layout.length.toDouble()).toInt()
        require(size * size == layout.length) { "Puzzle encoding must describe a square board." }

        val cells =
            (0 until size).map { row ->
                (0 until size).map { col ->
                    val index = row * size + col
                    val regionId = layout[index].toString()
                    CellState(
                        position = Position(row, col),
                        groupColor = if (regionId == ".") null else regionId,
                        isSolutionQueen = queens[index] == 'Q',
                        markType = if (queens[index] == 'Q') MarkType.QUEEN else MarkType.NONE,
                    )
                }
            }

        return BoardState(
            size = size,
            cells = cells,
            generationPhase = GenerationPhase.ANALYZED,
            metadata = metadata,
        )
    }

    fun encodeUrlLayout(boardState: BoardState): String {
        val regionSymbolMap = linkedMapOf<String, Char>()
        val regionSymbols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        var nextIndex = 0

        val rawLayout = buildString {
            for (cell in boardState.cells.flatten()) {
                val regionId = cell.groupColor
                if (regionId == null) {
                    append('.')
                    continue
                }

                val symbol = regionSymbolMap.getOrPut(regionId) {
                    val nextSymbol =
                        regionSymbols.getOrNull(nextIndex)
                            ?: error("Queens URL encoding supports at most 26 distinct region ids.")
                    nextIndex += 1
                    nextSymbol
                }

                append(if (cell.isSolutionQueen) symbol.lowercaseChar() else symbol)
            }
        }

        return Base64.getEncoder()
            .encodeToString(rawLayout.toByteArray(Charsets.UTF_8))
            .replace("+", "-")
            .replace("/", "_")
            .trimEnd('=')
    }
}
