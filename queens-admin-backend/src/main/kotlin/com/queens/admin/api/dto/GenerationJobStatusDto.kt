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
    val updatedAt: String,
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
)
