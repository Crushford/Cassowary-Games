package com.queens.admin.api.dto

data class BatchGenerationStatusDto(
    val batchId: String,
    val state: String,
    val totalJobs: Int,
    val queuedJobs: Int,
    val activeJobs: Int,
    val completedJobs: Int,
    val failedJobs: Int,
    val cancelledJobs: Int,
    val savedUniquePuzzles: Int,
    val duplicatePuzzles: Int,
    val persistenceErrors: Int,
    val maxConcurrentJobs: Int,
    val saveSuccessfulPuzzles: Boolean,
    val note: String? = null,
    val runs: List<BatchGenerationRunDto>,
    val updatedAt: String,
)

data class BatchGenerationRunDto(
    val runId: String,
    val size: Int,
    val strategy: String,
    val minimumGroupSize: Int,
    val state: String,
    val durationMs: Long? = null,
    val success: Boolean? = null,
    val error: String? = null,
    val startedAt: String? = null,
    val finishedAt: String? = null,
    val persistenceState: String? = null,
    val persistenceMessage: String? = null,
    val savedPuzzleId: String? = null,
)
