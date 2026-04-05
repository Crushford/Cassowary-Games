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
    companion object {
        private const val MAX_HISTORY_ENTRIES = 40
    }

    private val executor = Executors.newCachedThreadPool()
    private val jobs = ConcurrentHashMap<String, GenerationJobRuntime>()

    fun startGenerationJob(
        size: Int,
        queenCountMode: String = "exact",
        targetQueenCount: Int = size,
        orthogonalMinDistance: Int = size,
        minimumGroupSize: Int = 3,
        includeProgressUpdates: Boolean = false,
        generationStrategy: String = "baseline",
        seedTemplateOffsets: List<com.queens.admin.domain.model.Position>? = null,
    ): GenerationJobSnapshot {
        val jobId = UUID.randomUUID().toString()
        val initialSnapshot = GenerationJobSnapshot(
            jobId = jobId,
            state = GenerationJobState.QUEUED,
            attempt = 0,
            stage = "QUEUED",
            message = "Queued validated board generation.",
            coloredCellCount = 0,
            totalCellCount = size * size,
            strategy = generationStrategy,
        )

        val runtime = GenerationJobRuntime(
            size = size,
            queenCountMode = queenCountMode,
            targetQueenCount = targetQueenCount,
            orthogonalMinDistance = orthogonalMinDistance,
            minimumGroupSize = minimumGroupSize,
            includeProgressUpdates = includeProgressUpdates,
            generationStrategy = generationStrategy,
            seedTemplateOffsets = seedTemplateOffsets,
            startedAt = Instant.now(),
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

    fun getRunningJobCount(): Int = jobs.values.count { it.snapshot.get().state == GenerationJobState.RUNNING }

    fun getQueuedJobCount(): Int = jobs.values.count { it.snapshot.get().state == GenerationJobState.QUEUED }

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
            strategy = runtime.generationStrategy,
            metrics = runtime.snapshot.get().metrics,
            generationPhase = null,
        )

        try {
            val result = generationWorkflowService.generateValidBoard(
                size = runtime.size,
                queenCountMode = runtime.queenCountMode,
                targetQueenCount = runtime.targetQueenCount,
                orthogonalMinDistance = runtime.orthogonalMinDistance,
                minimumGroupSize = runtime.minimumGroupSize,
                generationStrategy = runtime.generationStrategy,
                seedTemplateOffsets = runtime.seedTemplateOffsets,
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
                            strategy = update.strategy,
                            metrics = update.metrics,
                            generationPhase = update.generationPhase,
                            boardState = update.boardState,
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
                strategy = runtime.snapshot.get().strategy,
                metrics = runtime.snapshot.get().metrics,
                generationPhase = result.boardState?.generationPhase?.name,
                boardState = result.boardState,
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
                strategy = runtime.snapshot.get().strategy,
                metrics = runtime.snapshot.get().metrics,
                generationPhase = runtime.snapshot.get().generationPhase,
                boardState = runtime.snapshot.get().boardState,
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
                strategy = runtime.snapshot.get().strategy,
                metrics = runtime.snapshot.get().metrics,
                generationPhase = runtime.snapshot.get().generationPhase,
                boardState = runtime.snapshot.get().boardState,
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
        strategy: String,
        metrics: GenerationMetricsSnapshot,
        generationPhase: String?,
        boardState: com.queens.admin.domain.model.BoardState? = null,
        result: com.queens.admin.domain.model.OperationResult? = null,
    ) {
        val now = Instant.now()
        val previous = runtime.snapshot.get()
        val nextHistoryEntry = GenerationHistoryEntry(
            attempt = attempt,
            stage = stage,
            message = message,
            coloredCellCount = coloredCellCount,
            totalCellCount = totalCellCount,
            generationPhase = generationPhase,
            createdAt = now,
        )
        runtime.snapshot.set(
            GenerationJobSnapshot(
                jobId = previous.jobId,
                state = state,
                attempt = attempt,
                stage = stage,
                message = message,
                coloredCellCount = coloredCellCount,
                totalCellCount = totalCellCount,
                strategy = strategy,
                metrics = metrics,
                elapsedMs = java.time.Duration.between(runtime.startedAt, now).toMillis(),
                generationPhase = generationPhase,
                boardState = boardState,
                result = result,
                history = (previous.history + nextHistoryEntry).takeLast(MAX_HISTORY_ENTRIES),
                updatedAt = now,
            ),
        )
    }

    private data class GenerationJobRuntime(
        val size: Int,
        val queenCountMode: String,
        val targetQueenCount: Int,
        val orthogonalMinDistance: Int,
        val minimumGroupSize: Int,
        val includeProgressUpdates: Boolean,
        val generationStrategy: String,
        val seedTemplateOffsets: List<com.queens.admin.domain.model.Position>?,
        val startedAt: Instant,
        val cancelled: AtomicBoolean,
        val snapshot: AtomicReference<GenerationJobSnapshot>,
    )
}
