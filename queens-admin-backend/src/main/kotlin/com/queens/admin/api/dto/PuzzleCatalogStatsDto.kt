package com.queens.admin.api.dto

data class CatalogPuzzleSelectionDto(
    val puzzleId: String,
    val size: Int,
    val orthogonalMinDistance: Int,
    val targetQueenCount: Int,
    val minimumGroupSize: Int,
    val difficulty: String?,
    val boardState: BoardStateDto,
)

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
    val difficulty: String?,
    val count: Int,
)

data class DeletePuzzleCatalogGroupRequestDto(
    val size: Int,
    val orthogonalMinDistance: Int,
    val targetQueenCount: Int,
    val minimumGroupSize: Int,
    val difficulty: String? = null,
)

data class DeletePuzzleCatalogGroupResultDto(
    val deletedCount: Int,
)
