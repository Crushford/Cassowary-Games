package com.queens.admin.api.dto

data class PuzzleCatalogStatsDto(
    val totalPuzzles: Int,
    val countsBySize: Map<String, Int>,
    val countsBySizeAndDistance: Map<String, Int>,
)
