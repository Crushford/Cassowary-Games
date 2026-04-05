package com.queens.admin.infrastructure.mapper

import com.queens.admin.api.dto.BatchGenerationRunDto
import com.queens.admin.api.dto.BatchGenerationStartedDto
import com.queens.admin.api.dto.BatchGenerationStatusDto
import com.queens.admin.application.BatchGenerationBatchSnapshot
import com.queens.admin.application.BatchGenerationRunSnapshot
import org.springframework.stereotype.Component

@Component
class BatchGenerationMapper {
    fun toStartedDto(snapshot: BatchGenerationBatchSnapshot): BatchGenerationStartedDto =
        BatchGenerationStartedDto(batchId = snapshot.batchId)

    fun toStatusDto(snapshot: BatchGenerationBatchSnapshot): BatchGenerationStatusDto =
        BatchGenerationStatusDto(
            batchId = snapshot.batchId,
            state = snapshot.state.name,
            totalJobs = snapshot.totalJobs,
            queuedJobs = snapshot.queuedJobs,
            activeJobs = snapshot.activeJobs,
            completedJobs = snapshot.completedJobs,
            failedJobs = snapshot.failedJobs,
            cancelledJobs = snapshot.cancelledJobs,
            savedUniquePuzzles = snapshot.savedUniquePuzzles,
            duplicatePuzzles = snapshot.duplicatePuzzles,
            persistenceErrors = snapshot.persistenceErrors,
            maxConcurrentJobs = snapshot.maxConcurrentJobs,
            saveSuccessfulPuzzles = snapshot.saveSuccessfulPuzzles,
            note = snapshot.note,
            runs = snapshot.runs.map(::toRunDto),
            updatedAt = snapshot.updatedAt.toString(),
        )

    private fun toRunDto(run: BatchGenerationRunSnapshot): BatchGenerationRunDto =
        BatchGenerationRunDto(
            runId = run.runId,
            size = run.size,
            strategy = run.strategy,
            queenCountMode = run.queenCountMode,
            targetQueenCount = run.targetQueenCount,
            orthogonalMinDistance = run.orthogonalMinDistance,
            minimumGroupSize = run.minimumGroupSize,
            state = run.state.name,
            coloredCellCount = run.coloredCellCount,
            totalCellCount = run.totalCellCount,
            durationMs = run.durationMs,
            success = run.success,
            error = run.error,
            startedAt = run.startedAt?.toString(),
            finishedAt = run.finishedAt?.toString(),
            persistenceState = run.persistenceState,
            persistenceMessage = run.persistenceMessage,
            savedPuzzleId = run.savedPuzzleId,
            encodedPuzzleLayout = run.encodedPuzzleLayout,
        )
}
