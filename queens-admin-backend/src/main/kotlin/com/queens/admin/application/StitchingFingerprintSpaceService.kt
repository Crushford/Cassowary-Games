package com.queens.admin.application

import com.queens.admin.domain.model.Position
import kotlin.math.abs
import org.springframework.stereotype.Service

@Service
class StitchingFingerprintSpaceService {
    data class FingerprintSpaceSnapshot(
        val leftSignatures: List<List<Int>>,
        val topSignatures: List<List<Int>>,
    ) {
        val leftOnlyFingerprintCount: Int = leftSignatures.size
        val topOnlyFingerprintCount: Int = topSignatures.size
        val bothFingerprintCount: Long = leftSignatures.size.toLong() * topSignatures.size.toLong()
        val totalFingerprintCount: Long = leftOnlyFingerprintCount + topOnlyFingerprintCount + bothFingerprintCount
    }

    private val snapshot: FingerprintSpaceSnapshot by lazy { computeFingerprintSpace() }

    fun snapshot(): FingerprintSpaceSnapshot = snapshot

    private fun computeFingerprintSpace(): FingerprintSpaceSnapshot {
        val size = StitchingPreviewService.BASE_SIZE
        val distance = StitchingPreviewService.ORTHOGONAL_MIN_DISTANCE
        val cells = buildList {
            for (row in 0 until size) {
                for (col in 0 until size) {
                    add(Position(row, col))
                }
            }
        }
        val queens = mutableListOf<Position>()
        val leftSignatures = linkedSetOf<String>()
        val topSignatures = linkedSetOf<String>()

        fun conflicts(left: Position, right: Position): Boolean {
            val rowDiff = abs(left.row - right.row)
            val colDiff = abs(left.col - right.col)
            return (left.row == right.row && colDiff < distance) ||
                (left.col == right.col && rowDiff < distance) ||
                (rowDiff == 1 && colDiff == 1)
        }

        fun horizontalSignature(): String =
            List(size) { row ->
                var prefix = 0
                while (prefix < size) {
                    val candidate = Position(row, size + prefix)
                    val hit = queens.any { queen -> conflicts(queen, candidate) }
                    if (!hit) break
                    prefix += 1
                }
                prefix
            }.joinToString(",")

        fun verticalSignature(): String =
            List(size) { col ->
                var prefix = 0
                while (prefix < size) {
                    val candidate = Position(size + prefix, col)
                    val hit = queens.any { queen -> conflicts(queen, candidate) }
                    if (!hit) break
                    prefix += 1
                }
                prefix
            }.joinToString(",")

        fun backtrack(index: Int) {
            if (index == cells.size) {
                leftSignatures += horizontalSignature()
                topSignatures += verticalSignature()
                return
            }

            backtrack(index + 1)

            val candidate = cells[index]
            if (queens.any { queen -> conflicts(candidate, queen) }) {
                return
            }
            queens += candidate
            backtrack(index + 1)
            queens.removeLast()
        }

        backtrack(0)

        return FingerprintSpaceSnapshot(
            leftSignatures = leftSignatures.map(::parseSignature),
            topSignatures = topSignatures.map(::parseSignature),
        )
    }

    private fun parseSignature(serialized: String): List<Int> =
        serialized.split(",").map(String::toInt)
}
