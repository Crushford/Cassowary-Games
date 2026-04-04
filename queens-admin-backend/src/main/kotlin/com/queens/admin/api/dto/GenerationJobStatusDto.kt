package com.queens.admin.api.dto

data class GenerationJobStatusDto(
    val jobId: String,
    val state: String,
    val attempt: Int,
    val stage: String,
    val message: String,
    val coloredCellCount: Int,
    val totalCellCount: Int,
    val generationPhase: String? = null,
    val result: OperationResultDto? = null,
    val updatedAt: String,
)
