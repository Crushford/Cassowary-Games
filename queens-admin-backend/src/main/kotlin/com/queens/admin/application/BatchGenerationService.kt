package com.queens.admin.application

import java.time.Duration
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import org.springframework.stereotype.Service

enum class BatchGenerationState {
    QUEUED,
    RUNNING,
    COMPLETED,
    CANCELLED,
}

enum class BatchGenerationRunState {
    QUEUED,
    RUNNING,
    COMPLETED,
    FAILED,
    CANCELLED,
}

data class BatchGenerationRunSnapshot(
    val runId: String,
    val size: Int,
    val strategy: String,
    val queenCountMode: String,
    val targetQueenCount: Int,
    val orthogonalMinDistance: Int,
    val minimumGroupSize: Int,
    val state: BatchGenerationRunState,
    val coloredCellCount: Int,
    val totalCellCount: Int,
    val durationMs: Long? = null,
    val success: Boolean? = null,
    val error: String? = null,
    val startedAt: Instant? = null,
    val finishedAt: Instant? = null,
    val persistenceState: String? = null,
    val persistenceMessage: String? = null,
    val savedPuzzleId: String? = null,
    val encodedPuzzleLayout: String? = null,
    val completedQueenCount: Int? = null,
    val difficulty: String? = null,
)

data class BatchGenerationBatchSnapshot(
    val batchId: String,
    val state: BatchGenerationState,
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
    val runs: List<BatchGenerationRunSnapshot>,
    val updatedAt: Instant = Instant.now(),
)

@Service
class BatchGenerationService(
    private val generationWorkflowService: GenerationWorkflowService,
    private val puzzleCatalogService: PuzzleCatalogService,
    private val persistedPuzzleBoardCodecService: com.queens.admin.domain.service.PersistedPuzzleBoardCodecService,
) {
    private fun com.queens.admin.domain.model.PuzzleDifficultyTier.toApiValue(): String = name.lowercase().replace('_', '-')
    private data class GenerationBucketKey(
        val size: Int,
        val orthogonalMinDistance: Int,
        val targetQueenCount: Int,
        val minimumGroupSize: Int,
    )

    private val coordinatorExecutor = Executors.newCachedThreadPool()
    private val workerExecutor = Executors.newCachedThreadPool()
    private val batches = ConcurrentHashMap<String, BatchRuntime>()

    fun startBatch(
        sizes: List<Int>,
        orthogonalMinDistances: List<Int>?,
        strategies: List<String>,
        runsPerCombination: Int,
        runMode: String,
        queenCountMode: String,
        targetQueenCount: Int?,
        orthogonalMinDistance: Int?,
        minimumGroupSize: Int,
        maxConcurrentJobs: Int,
        saveSuccessfulPuzzles: Boolean,
    ): BatchGenerationBatchSnapshot {
        require(sizes.isNotEmpty()) { "At least one puzzle size is required." }
        require(strategies.isNotEmpty()) { "At least one generation strategy is required." }
        require(runsPerCombination > 0) { "Runs per combination must be greater than zero." }

        val normalizedSizes = sizes.distinct().sorted().onEach { size ->
            require(size in 4..20) { "Batch generation supports puzzle sizes 4 through 20." }
        }
        val normalizedDistances =
            (orthogonalMinDistances ?: normalizedSizes)
                .distinct()
                .sorted()
                .onEach { distance ->
                    require(distance in 1..400) { "Orthogonal min distance must be between 1 and 400." }
                }
        val normalizedStrategies = strategies.distinct()
        val normalizedConcurrency = maxConcurrentJobs.coerceIn(1, Runtime.getRuntime().availableProcessors().coerceAtLeast(2))
        val normalizedRunMode = if (runMode.equals("lowest-count", ignoreCase = true)) "lowest-count" else "cartesian"
        val bucketCounts =
            if (normalizedRunMode == "lowest-count") {
                puzzleCatalogService.countByGenerationBucket().associate {
                    GenerationBucketKey(
                        size = it.size,
                        orthogonalMinDistance = it.orthogonalMinDistance,
                        targetQueenCount = it.targetQueenCount,
                        minimumGroupSize = it.minimumGroupSize,
                    ) to it.count
                }
            } else {
                emptyMap()
            }

        val unsortedRuns = buildList {
            normalizedSizes.forEach { size ->
                normalizedDistances.forEach { requestedDistance ->
                    val resolvedOrthogonalMinDistance = requestedDistance.coerceIn(1, size * size)
                    if (!com.queens.admin.domain.service.PrecomputedMaxQueenCounts.has(size, resolvedOrthogonalMinDistance)) {
                        return@forEach
                    }
                    val precomputedMaxQueenCount =
                        com.queens.admin.domain.service.PrecomputedMaxQueenCounts.get(
                            size,
                            resolvedOrthogonalMinDistance,
                        ) ?: return@forEach
                    val resolvedTargetQueenCount = when {
                        queenCountMode.equals("max", ignoreCase = true) -> precomputedMaxQueenCount
                        else -> (targetQueenCount ?: size).coerceIn(1, size * size)
                    }
                    normalizedStrategies.forEach { strategy ->
                        repeat(runsPerCombination) {
                            add(
                                BatchGenerationRunSnapshot(
                                    runId = UUID.randomUUID().toString(),
                                    size = size,
                                    strategy = strategy,
                                    queenCountMode = queenCountMode,
                                    targetQueenCount = resolvedTargetQueenCount,
                                    orthogonalMinDistance = resolvedOrthogonalMinDistance,
                                    minimumGroupSize = minimumGroupSize,
                                    state = BatchGenerationRunState.QUEUED,
                                    coloredCellCount = 0,
                                    totalCellCount = size * size,
                                ),
                            )
                        }
                    }
                }
            }
        }
        require(unsortedRuns.isNotEmpty()) {
            "Batch generation only supports size and min-distance combinations with precomputed max queen counts."
        }
        val runs =
            if (normalizedRunMode == "lowest-count") {
                unsortedRuns.sortedWith(
                    compareBy<BatchGenerationRunSnapshot> {
                        bucketCounts[
                            GenerationBucketKey(
                                size = it.size,
                                orthogonalMinDistance = it.orthogonalMinDistance,
                                targetQueenCount = it.targetQueenCount,
                                minimumGroupSize = it.minimumGroupSize,
                            ),
                        ] ?: 0
                    }.thenBy { it.size }
                        .thenBy { it.orthogonalMinDistance }
                        .thenBy { it.targetQueenCount }
                        .thenBy { it.minimumGroupSize }
                        .thenBy { it.strategy }
                )
            } else {
                unsortedRuns
            }

        val batchId = UUID.randomUUID().toString()
        val initialSnapshot = BatchGenerationBatchSnapshot(
            batchId = batchId,
            state = BatchGenerationState.QUEUED,
            totalJobs = runs.size,
            queuedJobs = runs.size,
            activeJobs = 0,
            completedJobs = 0,
            failedJobs = 0,
            cancelledJobs = 0,
            savedUniquePuzzles = 0,
            duplicatePuzzles = 0,
            persistenceErrors = 0,
            maxConcurrentJobs = normalizedConcurrency,
            saveSuccessfulPuzzles = saveSuccessfulPuzzles,
            note =
                buildList {
                    add(
                        if (saveSuccessfulPuzzles) {
                            "Successful generated puzzles will be saved to the DB when they are unique. Canonical duplicates are skipped."
                        } else {
                            "Save disabled for this batch."
                        },
                    )
                    if (normalizedRunMode == "lowest-count") {
                        add("Queued runs are ordered by the current lowest catalog count for the matching size, distance, queen-count, and minimum-group bucket.")
                    }
                }.joinToString(" "),
            runs = runs,
        )

        val runtime = BatchRuntime(
            maxConcurrentJobs = normalizedConcurrency,
            cancelled = AtomicBoolean(false),
            snapshot = AtomicReference(initialSnapshot),
        )
        batches[batchId] = runtime

        coordinatorExecutor.submit { runBatch(runtime) }

        return initialSnapshot
    }

    fun getBatchSnapshot(batchId: String): BatchGenerationBatchSnapshot? = batches[batchId]?.snapshot?.get()

    fun getActiveRunCount(): Int = batches.values.sumOf { runtime -> runtime.snapshot.get().activeJobs }

    fun getQueuedRunCount(): Int = batches.values.sumOf { runtime -> runtime.snapshot.get().queuedJobs }

    fun getRunningBatchCount(): Int =
        batches.values.count { runtime ->
            val state = runtime.snapshot.get().state
            state == BatchGenerationState.RUNNING || state == BatchGenerationState.QUEUED
        }

    fun cancelBatch(batchId: String): BatchGenerationBatchSnapshot? {
        val runtime = batches[batchId] ?: return null
        runtime.cancelled.set(true)
        updateBatchSnapshot(runtime) { snapshot ->
            snapshot.copy(
                state = BatchGenerationState.CANCELLED,
                note = "Cancellation requested. Active puzzle runs will stop after their current generation step.",
                updatedAt = Instant.now(),
            )
        }
        return runtime.snapshot.get()
    }

    private fun runBatch(runtime: BatchRuntime) {
        updateBatchSnapshot(runtime) { snapshot ->
            recomputeCounts(
                snapshot.copy(
                    state = BatchGenerationState.RUNNING,
                    updatedAt = Instant.now(),
                ),
            )
        }

        val queuedRuns = runtime.snapshot.get().runs.map { it.runId }.toMutableList()
        val activeRuns = linkedMapOf<String, Future<BatchGenerationRunSnapshot>>()

        while ((queuedRuns.isNotEmpty() || activeRuns.isNotEmpty()) && !runtime.cancelled.get()) {
            while (activeRuns.size < runtime.maxConcurrentJobs && queuedRuns.isNotEmpty() && !runtime.cancelled.get()) {
                val runId = queuedRuns.removeFirst()
                val runSnapshot = runtime.snapshot.get().runs.first { it.runId == runId }
                val startedAt = Instant.now()

                updateRun(runtime, runId) {
                    it.copy(
                        state = BatchGenerationRunState.RUNNING,
                        coloredCellCount = 0,
                        totalCellCount = runSnapshot.size * runSnapshot.size,
                        startedAt = startedAt,
                        error = null,
                    )
                }

                activeRuns[runId] = workerExecutor.submit<BatchGenerationRunSnapshot> {
                    var finishedAt: Instant
                    try {
                        val result = generationWorkflowService.generateValidBoard(
                            size = runSnapshot.size,
                            queenCountMode = runSnapshot.queenCountMode,
                            targetQueenCount = runSnapshot.targetQueenCount,
                            orthogonalMinDistance = runSnapshot.orthogonalMinDistance,
                            minimumGroupSize = runSnapshot.minimumGroupSize,
                            generationStrategy = runSnapshot.strategy,
                            progressListener = { update ->
                                updateRun(runtime, runSnapshot.runId) { current ->
                                    current.copy(
                                        state =
                                            if (runtime.cancelled.get()) {
                                                BatchGenerationRunState.CANCELLED
                                            } else {
                                                BatchGenerationRunState.RUNNING
                                            },
                                        coloredCellCount = update.coloredCellCount,
                                        totalCellCount = update.totalCellCount,
                                    )
                                }
                            },
                            isCancelled = { runtime.cancelled.get() },
                        )
                        finishedAt = Instant.now()
                        val latestRunSnapshot =
                            runtime.snapshot.get().runs.firstOrNull { it.runId == runSnapshot.runId } ?: runSnapshot
                        val completedQueenCount = result.boardState?.cells?.sumOf { row ->
                            row.count { cell -> cell.isSolutionQueen }
                        }
                        val persistenceResult =
                            if (result.success && runtime.snapshot.get().saveSuccessfulPuzzles && result.boardState != null) {
                                puzzleCatalogService.saveGeneratedPuzzleIfUnique(
                                    boardState = result.boardState,
                                    minimumGroupSize = runSnapshot.minimumGroupSize,
                                    generationStrategy = runSnapshot.strategy,
                                )
                            } else {
                                null
                            }
                        val assessedDifficulty =
                            when {
                                persistenceResult?.puzzle?.difficultyTier != null -> persistenceResult.puzzle.difficultyTier?.toApiValue()
                                result.success && result.boardState != null -> puzzleCatalogService
                                    .assessGeneratedPuzzle(
                                        boardState = result.boardState,
                                        minimumGroupSize = runSnapshot.minimumGroupSize,
                                        generationStrategy = runSnapshot.strategy,
                                    )
                                    .difficultyTier
                                    .toApiValue()
                                else -> null
                            }
                        BatchGenerationRunSnapshot(
                            runId = runSnapshot.runId,
                            size = runSnapshot.size,
                            strategy = runSnapshot.strategy,
                            queenCountMode = runSnapshot.queenCountMode,
                            targetQueenCount = runSnapshot.targetQueenCount,
                            orthogonalMinDistance = runSnapshot.orthogonalMinDistance,
                            minimumGroupSize = runSnapshot.minimumGroupSize,
                            state = if (runtime.cancelled.get()) BatchGenerationRunState.CANCELLED else if (result.success) BatchGenerationRunState.COMPLETED else BatchGenerationRunState.FAILED,
                            coloredCellCount = result.validation?.coloredCellCount ?: latestRunSnapshot.coloredCellCount,
                            totalCellCount = runSnapshot.size * runSnapshot.size,
                            durationMs = Duration.between(startedAt, finishedAt).toMillis(),
                            success = result.success,
                            error = result.errorSummary(),
                            startedAt = startedAt,
                            finishedAt = finishedAt,
                            persistenceState = persistenceResult?.state ?: if (runtime.snapshot.get().saveSuccessfulPuzzles) null else "SKIPPED",
                            persistenceMessage =
                                when (persistenceResult?.state) {
                                    "SAVED" -> "Saved to puzzle catalog."
                                    "DUPLICATE" -> "Skipped save because a canonical duplicate already exists."
                                    "UNSOLVABLE" -> "Rejected because the difficulty assessor could not solve the puzzle."
                                    else -> if (runtime.snapshot.get().saveSuccessfulPuzzles) null else "Save disabled for this batch."
                                },
                            savedPuzzleId = persistenceResult?.puzzle?.id?.toString(),
                            encodedPuzzleLayout = result.boardState?.let(persistedPuzzleBoardCodecService::encodeUrlLayout),
                            completedQueenCount = completedQueenCount,
                            difficulty = assessedDifficulty,
                        )
                    } catch (error: Throwable) {
                        finishedAt = Instant.now()
                        BatchGenerationRunSnapshot(
                            runId = runSnapshot.runId,
                            size = runSnapshot.size,
                            strategy = runSnapshot.strategy,
                            queenCountMode = runSnapshot.queenCountMode,
                            targetQueenCount = runSnapshot.targetQueenCount,
                            orthogonalMinDistance = runSnapshot.orthogonalMinDistance,
                            minimumGroupSize = runSnapshot.minimumGroupSize,
                            state = if (runtime.cancelled.get()) BatchGenerationRunState.CANCELLED else BatchGenerationRunState.FAILED,
                            coloredCellCount = runtime.snapshot.get().runs.firstOrNull { it.runId == runSnapshot.runId }?.coloredCellCount ?: 0,
                            totalCellCount = runSnapshot.size * runSnapshot.size,
                            durationMs = Duration.between(startedAt, finishedAt).toMillis(),
                            success = false,
                            error = error.message ?: "Generation crashed unexpectedly.",
                            startedAt = startedAt,
                            finishedAt = finishedAt,
                            persistenceState = if (runtime.snapshot.get().saveSuccessfulPuzzles) "ERROR" else "SKIPPED",
                            persistenceMessage =
                                if (runtime.snapshot.get().saveSuccessfulPuzzles) {
                                    "Failed before puzzle could be persisted."
                                } else {
                                    "Save disabled for this batch."
                                },
                            encodedPuzzleLayout = null,
                            completedQueenCount = null,
                            difficulty = null,
                        )
                    }
                }

                updateBatchSnapshot(runtime) { snapshot -> recomputeCounts(snapshot.copy(updatedAt = Instant.now())) }
            }

            val iterator = activeRuns.entries.iterator()
            while (iterator.hasNext()) {
                val entry = iterator.next()
                if (!entry.value.isDone) continue

                val runResult = try {
                    entry.value.get()
                } catch (error: Throwable) {
                    val previous = runtime.snapshot.get().runs.first { it.runId == entry.key }
                    BatchGenerationRunSnapshot(
                        runId = previous.runId,
                        size = previous.size,
                        strategy = previous.strategy,
                        queenCountMode = previous.queenCountMode,
                        targetQueenCount = previous.targetQueenCount,
                        orthogonalMinDistance = previous.orthogonalMinDistance,
                        minimumGroupSize = previous.minimumGroupSize,
                        state = if (runtime.cancelled.get()) BatchGenerationRunState.CANCELLED else BatchGenerationRunState.FAILED,
                        coloredCellCount = previous.coloredCellCount,
                        totalCellCount = previous.totalCellCount,
                        durationMs = previous.startedAt?.let { Duration.between(it, Instant.now()).toMillis() },
                        success = false,
                        error = error.message ?: "Generation crashed unexpectedly.",
                        startedAt = previous.startedAt,
                        finishedAt = Instant.now(),
                        encodedPuzzleLayout = previous.encodedPuzzleLayout,
                    )
                }

                updateRun(runtime, runResult.runId) { runResult }
                iterator.remove()
            }

            updateBatchSnapshot(runtime) { snapshot -> recomputeCounts(snapshot.copy(updatedAt = Instant.now())) }
            Thread.sleep(100)
        }

        if (runtime.cancelled.get()) {
            activeRuns.values.forEach { it.cancel(true) }
            updateBatchSnapshot(runtime) { snapshot ->
                val updatedRuns = snapshot.runs.map { run ->
                    if (run.state == BatchGenerationRunState.QUEUED || run.state == BatchGenerationRunState.RUNNING) {
                        run.copy(
                            state = BatchGenerationRunState.CANCELLED,
                            finishedAt = Instant.now(),
                        )
                    } else {
                        run
                    }
                }
                recomputeCounts(
                    snapshot.copy(
                        state = BatchGenerationState.CANCELLED,
                        runs = updatedRuns,
                        updatedAt = Instant.now(),
                    ),
                )
            }
            return
        }

        updateBatchSnapshot(runtime) { snapshot ->
            recomputeCounts(
                snapshot.copy(
                    state = BatchGenerationState.COMPLETED,
                    updatedAt = Instant.now(),
                ),
            )
        }
    }

    private fun updateRun(
        runtime: BatchRuntime,
        runId: String,
        transform: (BatchGenerationRunSnapshot) -> BatchGenerationRunSnapshot,
    ) {
        updateBatchSnapshot(runtime) { snapshot ->
            recomputeCounts(
                snapshot.copy(
                    runs = snapshot.runs.map { run -> if (run.runId == runId) transform(run) else run },
                    updatedAt = Instant.now(),
                ),
            )
        }
    }

    private fun updateBatchSnapshot(
        runtime: BatchRuntime,
        transform: (BatchGenerationBatchSnapshot) -> BatchGenerationBatchSnapshot,
    ) {
        runtime.snapshot.updateAndGet(transform)
    }

    private fun recomputeCounts(snapshot: BatchGenerationBatchSnapshot): BatchGenerationBatchSnapshot {
        val queued = snapshot.runs.count { it.state == BatchGenerationRunState.QUEUED }
        val active = snapshot.runs.count { it.state == BatchGenerationRunState.RUNNING }
        val completed = snapshot.runs.count { it.state == BatchGenerationRunState.COMPLETED }
        val failed = snapshot.runs.count { it.state == BatchGenerationRunState.FAILED }
        val cancelled = snapshot.runs.count { it.state == BatchGenerationRunState.CANCELLED }
        val savedUniquePuzzles = snapshot.runs.count { it.persistenceState == "SAVED" }
        val duplicatePuzzles = snapshot.runs.count { it.persistenceState == "DUPLICATE" }
        val persistenceErrors = snapshot.runs.count { it.persistenceState == "ERROR" }
        return snapshot.copy(
            queuedJobs = queued,
            activeJobs = active,
            completedJobs = completed,
            failedJobs = failed,
            cancelledJobs = cancelled,
            savedUniquePuzzles = savedUniquePuzzles,
            duplicatePuzzles = duplicatePuzzles,
            persistenceErrors = persistenceErrors,
        )
    }

    private fun com.queens.admin.domain.model.OperationResult.errorSummary(): String? =
        errors.takeIf { it.isNotEmpty() }?.joinToString(" ")

    private data class BatchRuntime(
        val maxConcurrentJobs: Int,
        val cancelled: AtomicBoolean,
        val snapshot: AtomicReference<BatchGenerationBatchSnapshot>,
    )
}
