package com.queens.admin.domain.model

data class CellState(
    val position: Position,
    val groupColor: String? = null,
    val isSolutionQueen: Boolean = false,
    val markType: MarkType = MarkType.NONE,
    val isBlackout: Boolean = false,
)
