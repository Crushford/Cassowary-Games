package com.queens.admin.domain.model

data class BoardState(
    val size: Int,
    val cells: List<List<CellState>>,
    val generationPhase: GenerationPhase = GenerationPhase.EMPTY,
    val metadata: Map<String, String> = emptyMap(),
    val containsBlackedOutSquares: Boolean = false,
)
