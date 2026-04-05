package com.queens.admin.domain.model

data class QueensRuleset(
    val orthogonalMinDistance: Int,
    val forbidDiagonalTouch: Boolean = true,
    val requireRowCoverage: Boolean = false,
    val requireColumnCoverage: Boolean = false,
) {
    init {
        require(orthogonalMinDistance >= 1) { "orthogonalMinDistance must be at least 1." }
    }

    companion object {
        fun classic(boardSize: Int): QueensRuleset =
            QueensRuleset(
                orthogonalMinDistance = boardSize,
                forbidDiagonalTouch = true,
                requireRowCoverage = true,
                requireColumnCoverage = true,
            )
    }
}
