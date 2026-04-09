package com.queens.admin.api.dto

data class PuzzleCatalogStatsDto(
    val totalPuzzles: Int,
    val countsBySize: Map<String, Int>,
    val countsBySizeAndDistance: Map<String, Int>,
    val groups: List<PuzzleCatalogGroupDto>,
)

data class PuzzleCatalogGroupDto(
    val size: Int,
    val orthogonalMinDistance: Int,
    val targetQueenCount: Int,
    val minimumGroupSize: Int,
    val count: Int,
)

data class DeletePuzzleCatalogGroupRequestDto(
    val size: Int,
    val orthogonalMinDistance: Int,
    val targetQueenCount: Int,
    val minimumGroupSize: Int,
)

data class DeletePuzzleCatalogGroupResultDto(
    val deletedCount: Int,
)
