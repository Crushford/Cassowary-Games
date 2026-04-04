package com.queens.admin.application

import com.queens.admin.domain.model.OperationResult
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
    val generationPhase: String? = null,
)

data class GenerationJobSnapshot(
    val jobId: String,
    val state: GenerationJobState,
    val attempt: Int,
    val stage: String,
    val message: String,
    val coloredCellCount: Int,
    val totalCellCount: Int,
    val generationPhase: String? = null,
    val result: OperationResult? = null,
    val updatedAt: Instant = Instant.now(),
)
