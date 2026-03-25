package com.queens.admin.api.dto

data class BoardStateDto(
    val size: Int,
    val cells: List<List<CellDto>>,
    val generationPhase: String? = null,
    val metadata: Map<String, String> = emptyMap(),
)
