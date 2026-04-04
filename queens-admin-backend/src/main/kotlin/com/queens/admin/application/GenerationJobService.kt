package com.queens.admin.application

import java.time.Instant
import java.util.UUID
import java.util.concurrent.CancellationException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import org.springframework.stereotype.Service

@Service
class GenerationJobService(
    private val generationWorkflowService: GenerationWorkflowService,
) {
    private val executor = Executors.newCachedThreadPool()
    private val jobs = ConcurrentHashMap<String, GenerationJobRuntime>()

    fun startGenerationJob(size: Int, includeProgressUpdates: Boolean = false): GenerationJobSnapshot {
        val jobId = UUID.randomUUID().toString()
        val initialSnapshot = GenerationJobSnapshot(
            jobId = jobId,
            state = GenerationJobState.QUEUED,
            attempt = 0,
            stage = "QUEUED",
            message = "Queued validated board generation.",
            coloredCellCount = 0,
            totalCellCount = size * size,
        )

        val runtime = GenerationJobRuntime(
            size = size,
            includeProgressUpdates = includeProgressUpdates,
            cancelled = AtomicBoolean(false),
            snapshot = AtomicReference(initialSnapshot),
        )
        jobs[jobId] = runtime

        executor.submit {
            runJob(jobId, runtime)
        }

        return initialSnapshot
    }

    fun getJobSnapshot(jobId: String): GenerationJobSnapshot? = jobs[jobId]?.snapshot?.get()

    fun cancelJob(jobId: String): GenerationJobSnapshot? {
        val runtime = jobs[jobId] ?: return null
        runtime.cancelled.set(true)

        val current = runtime.snapshot.get()
        val updated = current.copy(
            state = when (current.state) {
                GenerationJobState.COMPLETED,
                GenerationJobState.FAILED,
                GenerationJobState.CANCELLED,
                -> current.state
                else -> GenerationJobState.RUNNING
            },
            message = "Cancellation requested. Waiting for the current generation step to stop.",
            updatedAt = Instant.now(),
        )
        runtime.snapshot.set(updated)
        return updated
    }

    private fun runJob(jobId: String, runtime: GenerationJobRuntime) {
        updateSnapshot(
            runtime = runtime,
            state = GenerationJobState.RUNNING,
            attempt = 0,
            stage = "STARTING",
            message = "Starting validated board generation.",
            coloredCellCount = 0,
            totalCellCount = runtime.size * runtime.size,
            generationPhase = null,
        )

        try {
            val result = generationWorkflowService.generateValidBoard(
                size = runtime.size,
                progressListener = if (runtime.includeProgressUpdates) {
                    { update ->
                        updateSnapshot(
                            runtime = runtime,
                            state = if (runtime.cancelled.get()) GenerationJobState.CANCELLED else GenerationJobState.RUNNING,
                            attempt = update.attempt,
                            stage = update.stage,
                            message = update.message,
                            coloredCellCount = update.coloredCellCount,
                            totalCellCount = update.totalCellCount,
                            generationPhase = update.generationPhase,
                        )
                    }
                } else {
                    null
                },
                isCancelled = { runtime.cancelled.get() },
            )

            val terminalState = when {
                runtime.cancelled.get() -> GenerationJobState.CANCELLED
                result.success -> GenerationJobState.COMPLETED
                else -> GenerationJobState.FAILED
            }

            val coloredCellCount = result.validation?.coloredCellCount
                ?: runtime.snapshot.get().coloredCellCount

            updateSnapshot(
                runtime = runtime,
                state = terminalState,
                attempt = runtime.snapshot.get().attempt,
                stage = terminalState.name,
                message = when (terminalState) {
                    GenerationJobState.COMPLETED -> "Generation finished successfully."
                    GenerationJobState.CANCELLED -> "Generation was cancelled."
                    GenerationJobState.FAILED -> "Generation failed."
                    else -> runtime.snapshot.get().message
                },
                coloredCellCount = coloredCellCount,
                totalCellCount = runtime.size * runtime.size,
                generationPhase = result.boardState?.generationPhase?.name,
                result = result,
            )
        } catch (_: CancellationException) {
            updateSnapshot(
                runtime = runtime,
                state = GenerationJobState.CANCELLED,
                attempt = runtime.snapshot.get().attempt,
                stage = "CANCELLED",
                message = "Generation was cancelled.",
                coloredCellCount = runtime.snapshot.get().coloredCellCount,
                totalCellCount = runtime.size * runtime.size,
                generationPhase = runtime.snapshot.get().generationPhase,
            )
        } catch (error: Throwable) {
            updateSnapshot(
                runtime = runtime,
                state = GenerationJobState.FAILED,
                attempt = runtime.snapshot.get().attempt,
                stage = "FAILED",
                message = error.message ?: "Generation crashed unexpectedly.",
                coloredCellCount = runtime.snapshot.get().coloredCellCount,
                totalCellCount = runtime.size * runtime.size,
                generationPhase = runtime.snapshot.get().generationPhase,
            )
        }
    }

    private fun updateSnapshot(
        runtime: GenerationJobRuntime,
        state: GenerationJobState,
        attempt: Int,
        stage: String,
        message: String,
        coloredCellCount: Int,
        totalCellCount: Int,
        generationPhase: String?,
        result: com.queens.admin.domain.model.OperationResult? = null,
    ) {
        runtime.snapshot.set(
            GenerationJobSnapshot(
                jobId = runtime.snapshot.get().jobId,
                state = state,
                attempt = attempt,
                stage = stage,
                message = message,
                coloredCellCount = coloredCellCount,
                totalCellCount = totalCellCount,
                generationPhase = generationPhase,
                result = result,
                updatedAt = Instant.now(),
            ),
        )
    }

    private data class GenerationJobRuntime(
        val size: Int,
        val includeProgressUpdates: Boolean,
        val cancelled: AtomicBoolean,
        val snapshot: AtomicReference<GenerationJobSnapshot>,
    )
}
