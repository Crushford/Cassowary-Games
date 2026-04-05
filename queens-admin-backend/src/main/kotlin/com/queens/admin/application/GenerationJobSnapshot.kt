package com.queens.admin.application

import com.queens.admin.domain.model.OperationResult
import com.queens.admin.domain.model.BoardState
import java.time.Instant

enum class GenerationJobState {
    QUEUED,
    RUNNING,
    COMPLETED,
    FAILED,
    CANCELLED,
}

data class GenerationProgressUpdate(
    val attempt: Int,
    val stage: String,
    val message: String,
    val coloredCellCount: Int,
    val totalCellCount: Int,
    val strategy: String,
    val metrics: GenerationMetricsSnapshot,
    val generationPhase: String? = null,
    val boardState: BoardState? = null,
)

data class GenerationHistoryEntry(
    val attempt: Int,
    val stage: String,
    val message: String,
    val coloredCellCount: Int,
    val totalCellCount: Int,
    val generationPhase: String? = null,
    val createdAt: Instant = Instant.now(),
)

data class GenerationMetricsSnapshot(
    val solverChecks: Int = 0,
    val rollbacks: Int = 0,
    val markerSquares: Int = 0,
    val markerBlocks: Int = 0,
    val markerGuidedCandidates: Int = 0,
    val markerGuidedPlacements: Int = 0,
    val fallbackPlacements: Int = 0,
    val successfulPlacements: Int = 0,
)

data class GenerationJobSnapshot(
    val jobId: String,
    val state: GenerationJobState,
    val attempt: Int,
    val stage: String,
    val message: String,
    val coloredCellCount: Int,
    val totalCellCount: Int,
    val strategy: String,
    val metrics: GenerationMetricsSnapshot = GenerationMetricsSnapshot(),
    val elapsedMs: Long = 0,
    val generationPhase: String? = null,
    val boardState: BoardState? = null,
    val result: OperationResult? = null,
    val history: List<GenerationHistoryEntry> = emptyList(),
    val updatedAt: Instant = Instant.now(),
)
