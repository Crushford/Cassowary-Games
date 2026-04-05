package com.queens.admin.domain.service

import com.queens.admin.domain.model.BoardState
import org.springframework.stereotype.Service

@Service
class CanonicalPuzzleSignatureService {
    private val signatureSymbols = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

    data class EncodedPuzzle(
        val layout: String,
        val queens: String,
    )

    fun computeSignature(boardState: BoardState): String {
        val encodedPuzzle = encodeBoardState(boardState)
        return computeSignature(encodedPuzzle.layout, encodedPuzzle.queens)
    }

    fun encodeBoardState(boardState: BoardState): EncodedPuzzle {
        val remap = linkedMapOf<String, Char>()
        var nextIndex = 0
        val layout = StringBuilder(boardState.size * boardState.size)
        val queens = StringBuilder(boardState.size * boardState.size)

        boardState.cells.flatten().forEach { cell ->
            val regionId = cell.groupColor
            if (regionId == null) {
                layout.append('.')
            } else {
                val normalized = remap.getOrPut(regionId) {
                    require(nextIndex < signatureSymbols.length) {
                        "Too many unique region symbols to encode."
                    }
                    signatureSymbols[nextIndex++]
                }
                layout.append(normalized)
            }

            queens.append(if (cell.isSolutionQueen) 'Q' else '.')
        }

        return EncodedPuzzle(
            layout = layout.toString(),
            queens = queens.toString(),
        )
    }

    fun computeSignature(layout: String, queens: String): String {
        require(layout.length == queens.length) { "Layout and queens strings must be the same length." }
        val size = kotlin.math.sqrt(layout.length.toDouble()).toInt()
        require(size * size == layout.length) { "Layout and queens must represent a square puzzle." }

        return transformations()
            .map { transform -> encodeVariant(layout, queens, size, transform) }
            .minOrNull()
            ?: error("Unable to compute canonical signature")
    }

    private fun encodeVariant(
        layout: String,
        queens: String,
        size: Int,
        transform: (Int, Int, Int) -> Pair<Int, Int>,
    ): String {
        val remap = linkedMapOf<String, Char>()
        var nextIndex = 0
        val normalizedLayout = StringBuilder(layout.length)
        val transformedQueens = StringBuilder(queens.length)

        for (row in 0 until size) {
            for (col in 0 until size) {
                val (sourceRow, sourceCol) = transform(row, col, size)
                val sourceIndex = sourceRow * size + sourceCol
                val regionId = layout[sourceIndex].toString()
                val normalized = remap.getOrPut(regionId) {
                    require(nextIndex < signatureSymbols.length) {
                        "Too many unique region symbols to normalize."
                    }
                    signatureSymbols[nextIndex++]
                }
                normalizedLayout.append(normalized)
                transformedQueens.append(queens[sourceIndex])
            }
        }

        return "${transformedQueens}|${normalizedLayout}"
    }

    private fun transformations(): List<(Int, Int, Int) -> Pair<Int, Int>> = listOf(
        { row, col, _ -> row to col },
        { row, col, size -> (size - 1 - col) to row },
        { row, col, size -> (size - 1 - row) to (size - 1 - col) },
        { row, col, size -> col to (size - 1 - row) },
        { row, col, size -> row to (size - 1 - col) },
        { row, col, size -> (size - 1 - row) to col },
        { row, col, _ -> col to row },
        { row, col, size -> (size - 1 - col) to (size - 1 - row) },
    )
}
