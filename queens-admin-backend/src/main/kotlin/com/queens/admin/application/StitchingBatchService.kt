package com.queens.admin.application

import com.queens.admin.domain.model.PersistedStitchingPuzzle
import com.queens.admin.domain.service.CanonicalPuzzleSignatureService
import com.queens.admin.domain.service.StitchingFingerprintService
import java.time.Instant
import java.util.ArrayDeque
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

enum class StitchingBatchState {
    QUEUED,
    RUNNING,
    COMPLETED,
    CANCELLED,
}

enum class StitchingBatchRunState {
    QUEUED,
    RUNNING,
    COMPLETED,
    FAILED,
    CANCELLED,
}

data class StitchingBatchRunRequest(
    val pieceKind: String,
    val leftBlackoutSignature: List<Int>,
    val topBlackoutSignature: List<Int>,
    val targetQueenCount: Int,
    val generationStrategy: String = StitchingPreviewService.GENERATION_STRATEGY,
)

data class StitchingBatchRequest(
    val size: Int = StitchingPreviewService.BASE_SIZE,
    val orthogonalMinDistance: Int = StitchingPreviewService.ORTHOGONAL_MIN_DISTANCE,
    val minimumGroupSize: Int = StitchingPreviewService.MINIMUM_GROUP_SIZE,
    val runsPerFingerprint: Int,
    val maxConcurrentJobs: Int,
    val preset: String? = null,
    val runs: List<StitchingBatchRunRequest>,
)

data class StitchingBatchRunSnapshot(
    val runId: String,
    val pieceKind: String,
    val leftBlackoutSignature: List<Int>,
    val topBlackoutSignature: List<Int>,
    val leftBlackoutFingerprint: String,
    val topBlackoutFingerprint: String,
    val fingerprintKey: String,
    val pieceCategory: String,
    val targetQueenCount: Int,
    val state: StitchingBatchRunState,
    val queenCount: Int? = null,
    val canonicalSignature: String? = null,
    val savedPuzzleId: String? = null,
    val persistenceState: String? = null,
    val persistenceMessage: String? = null,
    val error: String? = null,
    val startedAt: Instant? = null,
    val finishedAt: Instant? = null,
)

data class StitchingBatchSnapshot(
    val batchId: String,
    val state: StitchingBatchState,
    val totalJobs: Int,
    val queuedJobs: Int,
    val activeJobs: Int,
    val completedJobs: Int,
    val failedJobs: Int,
    val cancelledJobs: Int,
    val savedUniquePuzzles: Int,
    val duplicatePuzzles: Int,
    val note: String? = null,
    val runs: List<StitchingBatchRunSnapshot>,
    val updatedAt: Instant = Instant.now(),
)

@Service
class StitchingBatchService(
    private val stitchingPreviewService: StitchingPreviewService,
    private val stitchingCatalogService: StitchingCatalogService,
    private val stitchingFingerprintService: StitchingFingerprintService,
    private val canonicalPuzzleSignatureService: CanonicalPuzzleSignatureService,
    private val stitchingFingerprintSpaceService: StitchingFingerprintSpaceService,
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val coordinatorExecutor = Executors.newCachedThreadPool()
    private val workerExecutor = Executors.newCachedThreadPool()
    private val batches = ConcurrentHashMap<String, BatchRuntime>()
    private val recentRunLimit = 100

    fun startBatch(request: StitchingBatchRequest): StitchingBatchSnapshot {
        logger.info(
            "Batch start request received: size={}, orthogonalMinDistance={}, minimumGroupSize={}, runsPerFingerprint={}, maxConcurrentJobs={}, preset={}, explicitRuns={}",
            request.size,
            request.orthogonalMinDistance,
            request.minimumGroupSize,
            request.runsPerFingerprint,
            request.maxConcurrentJobs,
            request.preset,
            request.runs.size,
        )
        require(request.size == StitchingPreviewService.BASE_SIZE) { "Only 7x7 stitched batches are supported in this first pass." }
        require(request.orthogonalMinDistance == StitchingPreviewService.ORTHOGONAL_MIN_DISTANCE) {
            "Only orthogonal min distance 5 is supported in this first pass."
        }
        require(request.runsPerFingerprint > 0) { "Runs per fingerprint must be greater than zero." }
        require(request.preset != null || request.runs.isNotEmpty()) {
            "Provide either a stitching preset or at least one explicit stitching fingerprint run."
        }

        val planner = plannerFor(request)
        logger.info(
            "Batch planner resolved: totalJobs={}, note={}",
            planner.totalJobs,
            planner.note,
        )

        val batchId = UUID.randomUUID().toString()
        val snapshot =
            StitchingBatchSnapshot(
                batchId = batchId,
                state = StitchingBatchState.QUEUED,
                totalJobs = planner.totalJobs,
                queuedJobs = planner.totalJobs,
                activeJobs = 0,
                completedJobs = 0,
                failedJobs = 0,
                cancelledJobs = 0,
                savedUniquePuzzles = 0,
                duplicatePuzzles = 0,
                note = planner.note,
                runs = emptyList(),
            )
        val runtime =
            BatchRuntime(
                request = request,
                planner = planner,
                cancelled = AtomicBoolean(false),
                snapshot = AtomicReference(snapshot),
            )
        batches[batchId] = runtime
        coordinatorExecutor.submit { runBatch(runtime) }
        return snapshot
    }

    fun getBatchStatus(batchId: String): StitchingBatchSnapshot? = batches[batchId]?.snapshot?.get()

    fun cancelBatch(batchId: String): StitchingBatchSnapshot? {
        val runtime = batches[batchId] ?: return null
        runtime.cancelled.set(true)
        updateSnapshot(runtime) { snapshot ->
            snapshot.copy(state = StitchingBatchState.CANCELLED, updatedAt = Instant.now())
        }
        return runtime.snapshot.get()
    }

    fun getAllBatches(): List<StitchingBatchSnapshot> =
        batches.values.map { it.snapshot.get() }.sortedByDescending { it.updatedAt }

    private fun runBatch(runtime: BatchRuntime) {
        logger.info(
            "Batch run starting: batchId={}, totalJobs={}, note={}",
            runtime.snapshot.get().batchId,
            runtime.snapshot.get().totalJobs,
            runtime.snapshot.get().note,
        )
        updateSnapshot(runtime) { it.copy(state = StitchingBatchState.RUNNING, updatedAt = Instant.now()) }
        val maxConcurrent = runtime.request.maxConcurrentJobs.coerceAtLeast(1)
        val active = mutableMapOf<String, CompletableFuture<Unit>>()

        while (runtime.planner.hasNext() || active.isNotEmpty()) {
            if (runtime.cancelled.get()) {
                updateSnapshot(runtime) { snapshot ->
                    snapshot.copy(
                        queuedJobs = 0,
                        cancelledJobs = snapshot.cancelledJobs + snapshot.queuedJobs,
                        updatedAt = Instant.now(),
                    )
                }
                runtime.planner.cancel()
            }

            while (!runtime.cancelled.get() && active.size < maxConcurrent && runtime.planner.hasNext()) {
                val run = runtime.planner.next() ?: break
                updateSnapshot(runtime) { snapshot ->
                    snapshot.copy(
                        queuedJobs = (snapshot.queuedJobs - 1).coerceAtLeast(0),
                        activeJobs = snapshot.activeJobs + 1,
                        runs = upsertRecentRun(snapshot.runs, run.copy(state = StitchingBatchRunState.RUNNING, startedAt = Instant.now(), error = null)),
                        updatedAt = Instant.now(),
                    )
                }
                active[run.runId] =
                    CompletableFuture.runAsync(
                        { executeRun(runtime, run) },
                        workerExecutor,
                    ).thenApply { Unit }
            }

            val completedRunIds = active.filterValues { it.isDone }.keys.toList()
            completedRunIds.forEach { active.remove(it)?.join() }
            if (completedRunIds.isEmpty()) {
                Thread.sleep(50)
            }
        }

        updateSnapshot(runtime) { snapshot ->
            snapshot.copy(
                state = if (runtime.cancelled.get()) StitchingBatchState.CANCELLED else StitchingBatchState.COMPLETED,
                updatedAt = Instant.now(),
            )
        }
    }

    private fun executeRun(runtime: BatchRuntime, run: StitchingBatchRunSnapshot) {
        val request = runtime.request

        try {
            logger.info(
                "Batch run executing: batchId={}, runId={}, pieceKind={}, fingerprintKey={}, pieceCategory={}, leftFingerprint={}, topFingerprint={}",
                runtime.snapshot.get().batchId,
                run.runId,
                run.pieceKind,
                run.fingerprintKey,
                run.pieceCategory,
                run.leftBlackoutFingerprint,
                run.topBlackoutFingerprint,
            )
            val resolvedTargetQueenCount =
                stitchingCatalogService.knownMaxQueenCountForFingerprintKey(run.fingerprintKey)
                    ?: run.targetQueenCount
            val generated =
                stitchingPreviewService.generateCatalogPiece(
                    pieceKind = run.pieceKind,
                    leftBlackoutSignature = run.leftBlackoutSignature,
                    topBlackoutSignature = run.topBlackoutSignature,
                    targetQueenCount = resolvedTargetQueenCount,
                    allowTargetFallbackToMax = true,
                    randomSeed = run.runId.hashCode().toLong(),
                )
            val canonicalSignature =
                canonicalPuzzleSignatureService.computeSignature(generated.layout, generated.queens)
            val saved =
                stitchingCatalogService.savePiece(
                    PersistedStitchingPuzzle(
                        id = UUID.randomUUID(),
                        size = request.size,
                        layout = generated.layout,
                        queens = generated.queens,
                        targetQueenCount = generated.targetQueenCount,
                        queenCount = generated.queenCount,
                        orthogonalMinDistance = request.orthogonalMinDistance,
                        minimumGroupSize = request.minimumGroupSize,
                        generationStrategy = StitchingPreviewService.GENERATION_STRATEGY,
                        pieceKind = generated.pieceKind,
                        leftBlackoutSignature = generated.leftBlackoutSignature,
                        topBlackoutSignature = generated.topBlackoutSignature,
                        leftBlackoutFingerprint = run.leftBlackoutFingerprint,
                        topBlackoutFingerprint = run.topBlackoutFingerprint,
                        fingerprintKey = run.fingerprintKey,
                        isSeed = generated.pieceKind == "TOP_LEFT" &&
                            generated.leftBlackoutSignature.all { it == 0 } &&
                            generated.topBlackoutSignature.all { it == 0 },
                        pieceCategory = run.pieceCategory,
                        canonicalSignature = canonicalSignature,
                        createdAt = Instant.now(),
                    ),
                )

            val finished =
                run.copy(
                    state = StitchingBatchRunState.COMPLETED,
                    targetQueenCount = generated.targetQueenCount,
                    queenCount = generated.queenCount,
                    canonicalSignature = canonicalSignature,
                    savedPuzzleId = saved.puzzle?.id?.toString(),
                    persistenceState = saved.state,
                    persistenceMessage =
                        buildString {
                            append(saved.message ?: "Saved to stitching catalog.")
                            if (generated.targetQueenCount != run.targetQueenCount) {
                                append(" Resolved target adjusted from ${run.targetQueenCount} to ${generated.targetQueenCount}.")
                            }
                            if (resolvedTargetQueenCount != run.targetQueenCount &&
                                resolvedTargetQueenCount == generated.targetQueenCount
                            ) {
                                append(" Reused cached max queen count for this fingerprint.")
                            }
                        },
                    finishedAt = Instant.now(),
                )
            updateFinishedRun(runtime, finished)
        } catch (error: Exception) {
            logger.error(
                "Batch run failed: batchId={}, runId={}, pieceKind={}, fingerprintKey={}, message={}",
                runtime.snapshot.get().batchId,
                run.runId,
                run.pieceKind,
                run.fingerprintKey,
                error.message,
                error,
            )
            updateFinishedRun(
                runtime,
                run.copy(
                    state = if (runtime.cancelled.get()) StitchingBatchRunState.CANCELLED else StitchingBatchRunState.FAILED,
                    error = error.stackTraceToString(),
                    finishedAt = Instant.now(),
                ),
            )
        }
    }

    private fun updateFinishedRun(runtime: BatchRuntime, run: StitchingBatchRunSnapshot) {
        updateSnapshot(runtime) { snapshot ->
            snapshot.copy(
                activeJobs = (snapshot.activeJobs - 1).coerceAtLeast(0),
                completedJobs = snapshot.completedJobs + if (run.state == StitchingBatchRunState.COMPLETED) 1 else 0,
                failedJobs = snapshot.failedJobs + if (run.state == StitchingBatchRunState.FAILED) 1 else 0,
                cancelledJobs = snapshot.cancelledJobs + if (run.state == StitchingBatchRunState.CANCELLED) 1 else 0,
                savedUniquePuzzles = snapshot.savedUniquePuzzles + if (run.persistenceState == "SAVED") 1 else 0,
                duplicatePuzzles = snapshot.duplicatePuzzles + if (run.persistenceState == "DUPLICATE") 1 else 0,
                runs = upsertRecentRun(snapshot.runs, run),
                updatedAt = Instant.now(),
            )
        }
    }

    private fun updateSnapshot(
        runtime: BatchRuntime,
        transform: (StitchingBatchSnapshot) -> StitchingBatchSnapshot,
    ) {
        runtime.snapshot.updateAndGet(transform)
    }

    private fun upsertRecentRun(
        existingRuns: List<StitchingBatchRunSnapshot>,
        run: StitchingBatchRunSnapshot,
    ): List<StitchingBatchRunSnapshot> {
        val next = listOf(run) + existingRuns.filterNot { it.runId == run.runId }
        return next.take(recentRunLimit)
    }

    private data class BatchRuntime(
        val request: StitchingBatchRequest,
        val planner: RunPlanner,
        val cancelled: AtomicBoolean,
        val snapshot: AtomicReference<StitchingBatchSnapshot>,
    )

    private data class RunPlanner(
        val totalJobs: Int,
        val note: String,
        private val nextRunProvider: () -> StitchingBatchRunSnapshot?,
        private val hasNextProvider: () -> Boolean,
        private val cancelProvider: () -> Unit = {},
    ) {
        fun hasNext(): Boolean = hasNextProvider()
        fun next(): StitchingBatchRunSnapshot? = nextRunProvider()
        fun cancel() = cancelProvider()
    }

    private fun plannerFor(request: StitchingBatchRequest): RunPlanner {
        val preset = request.preset?.uppercase()
        return if (preset != null) {
            plannerForPreset(request, preset)
        } else {
            plannerForExplicitRuns(request)
        }
    }

    private fun plannerForExplicitRuns(request: StitchingBatchRequest): RunPlanner {
        val queue = ArrayDeque<StitchingBatchRunSnapshot>()
        request.runs.forEach { requestedRun ->
            repeat(request.runsPerFingerprint) {
                queue += prepareRunSnapshot(requestedRun, request.size)
            }
        }
        logger.info(
            "Batch explicit planner prepared: totalJobs={}, runs={}, uniqueFingerprints={}",
            queue.size,
            request.runs.size,
            request.runs.map { "${it.pieceKind}:${it.leftBlackoutSignature}:${it.topBlackoutSignature}" }.distinct().size,
        )
        return RunPlanner(
            totalJobs = queue.size,
            note = "Explicit stitching fingerprint batch. Duplicate canonical boards are skipped.",
            nextRunProvider = { if (queue.isEmpty()) null else queue.removeFirst() },
            hasNextProvider = { queue.isNotEmpty() },
            cancelProvider = { queue.clear() },
        )
    }

    private fun plannerForPreset(request: StitchingBatchRequest, preset: String): RunPlanner {
        val space = stitchingFingerprintSpaceService.snapshot()
        val runsPerFingerprint = request.runsPerFingerprint
        val totalJobs =
            when (preset) {
                "ALL_LEFT_ONLY" -> space.leftOnlyFingerprintCount * runsPerFingerprint
                "ALL_TOP_ONLY" -> space.topOnlyFingerprintCount * runsPerFingerprint
                "ALL_BOTH" -> (space.bothFingerprintCount * runsPerFingerprint).coerceAtMost(Int.MAX_VALUE.toLong()).toInt()
                "ALL_REACHABLE" ->
                    (space.totalFingerprintCount * runsPerFingerprint).coerceAtMost(Int.MAX_VALUE.toLong()).toInt()
                else -> error("Unsupported stitching batch preset: $preset")
            }
        logger.info(
            "Batch preset planner prepared: preset={}, totalJobs={}, leftOnly={}, topOnly={}, both={}, totalFingerprints={}",
            preset,
            totalJobs,
            space.leftOnlyFingerprintCount,
            space.topOnlyFingerprintCount,
            space.bothFingerprintCount,
            space.totalFingerprintCount,
        )

        var leftIndex = 0
        var topIndex = 0
        var repeatIndex = 0
        var stage = when (preset) {
            "ALL_LEFT_ONLY" -> "LEFT_ONLY"
            "ALL_TOP_ONLY" -> "TOP_ONLY"
            "ALL_BOTH" -> "BOTH"
            "ALL_REACHABLE" -> "LEFT_ONLY"
            else -> error("Unsupported stitching batch preset: $preset")
        }
        var cancelled = false

        fun buildLeftOnlyRun(signature: List<Int>): StitchingBatchRunRequest =
            StitchingBatchRunRequest(
                pieceKind = "TOP_RIGHT",
                leftBlackoutSignature = signature,
                topBlackoutSignature = List(request.size) { 0 },
                targetQueenCount = StitchingPreviewService.DEPENDENT_TARGET_QUEEN_COUNT,
            )

        fun buildTopOnlyRun(signature: List<Int>): StitchingBatchRunRequest =
            StitchingBatchRunRequest(
                pieceKind = "BOTTOM_LEFT",
                leftBlackoutSignature = List(request.size) { 0 },
                topBlackoutSignature = signature,
                targetQueenCount = StitchingPreviewService.DEPENDENT_TARGET_QUEEN_COUNT,
            )

        fun buildBothRun(leftSignature: List<Int>, topSignature: List<Int>): StitchingBatchRunRequest =
            StitchingBatchRunRequest(
                pieceKind = "BOTTOM_RIGHT",
                leftBlackoutSignature = leftSignature,
                topBlackoutSignature = topSignature,
                targetQueenCount = StitchingPreviewService.DEPENDENT_TARGET_QUEEN_COUNT,
            )

        fun normalizeStage() {
            if (preset != "ALL_REACHABLE") return
            when (stage) {
                "LEFT_ONLY" -> {
                    if (leftIndex >= space.leftSignatures.size) {
                        stage = "TOP_ONLY"
                        topIndex = 0
                        repeatIndex = 0
                    }
                }
                "TOP_ONLY" -> {
                    if (topIndex >= space.topSignatures.size) {
                        stage = "BOTH"
                        leftIndex = 0
                        topIndex = 0
                        repeatIndex = 0
                    }
                }
                "BOTH" -> {
                    if (leftIndex >= space.leftSignatures.size) {
                        stage = "DONE"
                    }
                }
            }
        }

        fun hasNext(): Boolean {
            normalizeStage()
            return !cancelled && when (stage) {
                "LEFT_ONLY" -> leftIndex < space.leftSignatures.size
                "TOP_ONLY" -> topIndex < space.topSignatures.size
                "BOTH" -> leftIndex < space.leftSignatures.size
                else -> false
            }
        }

        fun advanceAfterEmission() {
            repeatIndex += 1
            if (repeatIndex < runsPerFingerprint) return
            repeatIndex = 0
            when (stage) {
                "LEFT_ONLY" -> {
                    leftIndex += 1
                    normalizeStage()
                }
                "TOP_ONLY" -> {
                    topIndex += 1
                    normalizeStage()
                }
                "BOTH" -> {
                    topIndex += 1
                    if (topIndex >= space.topSignatures.size) {
                        topIndex = 0
                        leftIndex += 1
                    }
                    normalizeStage()
                }
            }
        }

        return RunPlanner(
            totalJobs = totalJobs,
            note =
                "Preset $preset batch. Reachable fingerprint counts: left-only ${space.leftOnlyFingerprintCount}, " +
                    "top-only ${space.topOnlyFingerprintCount}, both ${space.bothFingerprintCount}. " +
                    "Recent activity is capped to $recentRunLimit runs in the UI.",
            nextRunProvider = {
                if (!hasNext()) return@RunPlanner null
                val nextRequest =
                    when (stage) {
                        "LEFT_ONLY" -> buildLeftOnlyRun(space.leftSignatures[leftIndex])
                        "TOP_ONLY" -> buildTopOnlyRun(space.topSignatures[topIndex])
                        "BOTH" -> {
                            buildBothRun(space.leftSignatures[leftIndex], space.topSignatures[topIndex])
                        }
                        else -> null
                    } ?: return@RunPlanner null

                val snapshot = prepareRunSnapshot(nextRequest, request.size)
                advanceAfterEmission()
                snapshot
            },
            hasNextProvider = { hasNext() },
            cancelProvider = { cancelled = true },
        )
    }

    private fun prepareRunSnapshot(
        requestedRun: StitchingBatchRunRequest,
        boardSize: Int,
    ): StitchingBatchRunSnapshot {
        stitchingFingerprintService.validateSignature(
            requestedRun.leftBlackoutSignature,
            boardSize,
            "Left",
        )
        stitchingFingerprintService.validateSignature(
            requestedRun.topBlackoutSignature,
            boardSize,
            "Top",
        )
        val leftFingerprint =
            stitchingFingerprintService.rowFingerprintForSignature(requestedRun.leftBlackoutSignature)
        val topFingerprint =
            stitchingFingerprintService.columnFingerprintForSignature(requestedRun.topBlackoutSignature)
        val pieceCategory =
            stitchingFingerprintService.categoryFor(
                requestedRun.leftBlackoutSignature,
                requestedRun.topBlackoutSignature,
            )
        val fingerprintKey = stitchingFingerprintService.combinedFingerprintKey(leftFingerprint, topFingerprint)
        return StitchingBatchRunSnapshot(
            runId = UUID.randomUUID().toString(),
            pieceKind = requestedRun.pieceKind.uppercase(),
            leftBlackoutSignature = requestedRun.leftBlackoutSignature,
            topBlackoutSignature = requestedRun.topBlackoutSignature,
            leftBlackoutFingerprint = leftFingerprint,
            topBlackoutFingerprint = topFingerprint,
            fingerprintKey = fingerprintKey,
            pieceCategory = pieceCategory,
            targetQueenCount = requestedRun.targetQueenCount,
            state = StitchingBatchRunState.QUEUED,
        )
    }
}
