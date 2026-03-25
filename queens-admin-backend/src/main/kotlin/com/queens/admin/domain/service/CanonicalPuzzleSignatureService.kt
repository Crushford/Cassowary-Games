package com.queens.admin.domain.service

import com.queens.admin.domain.model.BoardState
import org.springframework.stereotype.Service

@Service
class CanonicalPuzzleSignatureService {
    fun computeSignature(boardState: BoardState): String {
        val colorRemap = linkedMapOf<String, String>()
        var nextColorOrdinal = 0

        return boardState.cells.joinToString(separator = "|") { row ->
            row.joinToString(separator = "") { cell ->
                val colorToken = cell.groupColor?.let { color ->
                    colorRemap.getOrPut(color) {
                        ('A'.code + nextColorOrdinal++).toChar().toString()
                    }
                } ?: "."
                val markToken = when (cell.markType.name) {
                    "QUEEN" -> "Q"
                    "FLAG" -> "F"
                    "INVALID" -> "X"
                    else -> "_"
                }
                "$colorToken$markToken"
            }
        }
    }
}
