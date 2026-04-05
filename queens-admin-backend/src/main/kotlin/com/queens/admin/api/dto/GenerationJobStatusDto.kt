package com.queens.admin.api.dto

data class GenerationJobStatusDto(
    val jobId: String,
    val state: String,
    val attempt: Int,
    val stage: String,
    val message: String,
    val coloredCellCount: Int,
    val totalCellCount: Int,
    val strategy: String,
    val metrics: GenerationMetricsStatusDto,
    val elapsedMs: Long,
    val generationPhase: String? = null,
    val boardState: BoardStateDto? = null,
    val result: OperationResultDto? = null,
    val history: List<GenerationHistoryEntryDto> = emptyList(),
    val updatedAt: String,
)

data class GenerationHistoryEntryDto(
    val attempt: Int,
    val stage: String,
    val message: String,
    val coloredCellCount: Int,
    val totalCellCount: Int,
    val generationPhase: String? = null,
    val createdAt: String,
)

data class GenerationMetricsStatusDto(
    val solverChecks: Int,
    val rollbacks: Int,
    val markerSquares: Int,
    val markerBlocks: Int,
    val markerGuidedCandidates: Int,
    val markerGuidedPlacements: Int,
    val fallbackPlacements: Int,
    val successfulPlacements: Int,
    val constrainedWindowHits: Int,
    val constrainedWindowFlags: Int,
    val deterministicSolved: Boolean?,
    val deterministicStepsTaken: Int,
    val deterministicQueensPlaced: Int,
    val deterministicUnresolvedSquares: Int,
    val deterministicHardestTier: String?,
    val deterministicLastRule: String?,
)
