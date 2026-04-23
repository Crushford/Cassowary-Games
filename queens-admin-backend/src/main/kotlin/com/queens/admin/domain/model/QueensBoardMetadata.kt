package com.queens.admin.domain.model

object QueensBoardMetadata {
    const val TARGET_QUEEN_COUNT_KEY = "targetQueenCount"
    const val ORTHOGONAL_MIN_DISTANCE_KEY = "orthogonalMinDistance"
    const val CONTAINS_BLACKOUT_SQUARES_KEY = "containsBlackedOutSquares"

    fun targetQueenCount(boardState: BoardState): Int =
        boardState.metadata[TARGET_QUEEN_COUNT_KEY]?.toIntOrNull()?.takeIf { it >= 1 }
            ?: boardState.size

    fun orthogonalMinDistance(boardState: BoardState): Int =
        boardState.metadata[ORTHOGONAL_MIN_DISTANCE_KEY]?.toIntOrNull()?.takeIf { it >= 1 }
            ?: boardState.size

    fun ruleset(boardState: BoardState): QueensRuleset {
        val targetQueenCount = targetQueenCount(boardState)
        val orthogonalMinDistance = orthogonalMinDistance(boardState)
        val shouldRequireLineCoverage =
            targetQueenCount == boardState.size && orthogonalMinDistance >= boardState.size

        return QueensRuleset(
            orthogonalMinDistance = orthogonalMinDistance,
            forbidDiagonalTouch = true,
            requireRowCoverage = shouldRequireLineCoverage,
            requireColumnCoverage = shouldRequireLineCoverage,
        )
    }

    fun metadata(
        boardSize: Int,
        targetQueenCount: Int = boardSize,
        orthogonalMinDistance: Int = boardSize,
        containsBlackedOutSquares: Boolean = false,
    ): Map<String, String> =
        mapOf(
            TARGET_QUEEN_COUNT_KEY to targetQueenCount.toString(),
            ORTHOGONAL_MIN_DISTANCE_KEY to orthogonalMinDistance.toString(),
            CONTAINS_BLACKOUT_SQUARES_KEY to containsBlackedOutSquares.toString(),
        )
}
