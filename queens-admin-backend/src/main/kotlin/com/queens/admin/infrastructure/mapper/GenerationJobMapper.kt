package com.queens.admin.infrastructure.mapper

import com.queens.admin.api.dto.GenerationJobStartedDto
import com.queens.admin.api.dto.GenerationHistoryEntryDto
import com.queens.admin.api.dto.GenerationMetricsStatusDto
import com.queens.admin.api.dto.GenerationJobStatusDto
import com.queens.admin.application.GenerationJobSnapshot
import org.springframework.stereotype.Component

@Component
class GenerationJobMapper(
    private val operationResultMapper: OperationResultMapper,
    private val boardStateMapper: BoardStateMapper,
) {
    fun toStartedDto(snapshot: GenerationJobSnapshot): GenerationJobStartedDto =
        GenerationJobStartedDto(jobId = snapshot.jobId)

    fun toStatusDto(snapshot: GenerationJobSnapshot): GenerationJobStatusDto =
        GenerationJobStatusDto(
            jobId = snapshot.jobId,
            state = snapshot.state.name,
            attempt = snapshot.attempt,
            stage = snapshot.stage,
            message = snapshot.message,
            coloredCellCount = snapshot.coloredCellCount,
            totalCellCount = snapshot.totalCellCount,
            strategy = snapshot.strategy,
            metrics = GenerationMetricsStatusDto(
                solverChecks = snapshot.metrics.solverChecks,
                rollbacks = snapshot.metrics.rollbacks,
                markerSquares = snapshot.metrics.markerSquares,
                markerBlocks = snapshot.metrics.markerBlocks,
                markerGuidedCandidates = snapshot.metrics.markerGuidedCandidates,
                markerGuidedPlacements = snapshot.metrics.markerGuidedPlacements,
                fallbackPlacements = snapshot.metrics.fallbackPlacements,
                successfulPlacements = snapshot.metrics.successfulPlacements,
            ),
            elapsedMs = snapshot.elapsedMs,
            generationPhase = snapshot.generationPhase,
            boardState = snapshot.boardState?.let(boardStateMapper::toDto),
            result = snapshot.result?.let(operationResultMapper::toDto),
            history = snapshot.history.map { entry ->
                GenerationHistoryEntryDto(
                    attempt = entry.attempt,
                    stage = entry.stage,
                    message = entry.message,
                    coloredCellCount = entry.coloredCellCount,
                    totalCellCount = entry.totalCellCount,
                    generationPhase = entry.generationPhase,
                    createdAt = entry.createdAt.toString(),
                )
            },
            updatedAt = snapshot.updatedAt.toString(),
        )
}
