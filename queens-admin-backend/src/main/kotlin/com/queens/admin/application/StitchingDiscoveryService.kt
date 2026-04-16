package com.queens.admin.application

import com.queens.admin.domain.model.PersistedStitchingPuzzle
import com.queens.admin.domain.service.CanonicalPuzzleSignatureService
import com.queens.admin.domain.service.StitchingFingerprintService
import java.time.Instant
import java.util.ArrayDeque
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import org.springframework.stereotype.Service

enum class StitchingDiscoveryRunState {
    IDLE,
    RUNNING,
    STOPPING,
    COMPLETED,
    INTERRUPTED,
    FAILED,
}

enum class StitchingDiscoveryBucketState {
    INFERRED,
    QUEUED,
    GENERATED,
    SKIPPED,
    FAILED,
}

data class StitchingDiscoveryRequest(
    val generationLimit: Int,
    val skipSatisfiedBuckets: Boolean,
    val maxConcurrentJobs: Int,
)

data class StitchingDiscoveryBucketSnapshot(
    val bucketKey: String,
    val pieceCategory: String,
    val pieceKind: String,
    val fingerprintKey: String,
    val leftBlackoutSignature: List<Int>,
    val topBlackoutSignature: List<Int>,
    val targetQueenCount: Int,
    val state: StitchingDiscoveryBucketState,
    val provenance: List<String>,
    val message: String? = null,
    val puzzleId: String? = null,
    val canonicalSignature: String? = null,
    val discoveredAt: Instant = Instant.now(),
)

data class StitchingDiscoverySnapshot(
    val runId: String,
    val state: StitchingDiscoveryRunState,
    val generationLimit: Int,
    val skipSatisfiedBuckets: Boolean,
    val maxConcurrentJobs: Int,
    val activeJobs: Int,
    val generatedCount: Int,
    val skippedCount: Int,
    val inferredCount: Int,
    val validatedCount: Int,
    val failedCount: Int,
    val queuedCount: Int,
    val activeBucket: StitchingDiscoveryBucketSnapshot? = null,
    val generatedBuckets: List<StitchingDiscoveryBucketSnapshot> = emptyList(),
    val skippedBuckets: List<StitchingDiscoveryBucketSnapshot> = emptyList(),
    val failedBuckets: List<StitchingDiscoveryBucketSnapshot> = emptyList(),
    val queuedBuckets: List<StitchingDiscoveryBucketSnapshot> = emptyList(),
    val inferredBuckets: List<StitchingDiscoveryBucketSnapshot> = emptyList(),
    val note: String? = null,
    val updatedAt: Instant = Instant.now(),
)

@Service
class StitchingDiscoveryService(
    private val stitchingPreviewService: StitchingPreviewService,
    private val stitchingCatalogService: StitchingCatalogService,
    private val stitchingFingerprintService: StitchingFingerprintService,
    private val canonicalPuzzleSignatureService: CanonicalPuzzleSignatureService,
) {
    private val coordinatorExecutor = Executors.newSingleThreadExecutor()
    private val workerExecutor = Executors.newCachedThreadPool()
    private val currentRun = AtomicReference<RunRuntime?>(null)

    fun startRun(request: StitchingDiscoveryRequest): StitchingDiscoverySnapshot {
        require(request.generationLimit > 0) { "Generation limit must be greater than zero." }
        require(request.maxConcurrentJobs > 0) { "Max concurrent jobs must be greater than zero." }
        check(currentRun.get() == null || currentRun.get()?.snapshot?.get()?.state !in setOf(
            StitchingDiscoveryRunState.RUNNING,
            StitchingDiscoveryRunState.STOPPING,
        )) { "A stitching discovery run is already active." }

        val initialSnapshot =
            StitchingDiscoverySnapshot(
                runId = UUID.randomUUID().toString(),
                state = StitchingDiscoveryRunState.RUNNING,
                generationLimit = request.generationLimit,
                skipSatisfiedBuckets = request.skipSatisfiedBuckets,
                maxConcurrentJobs = request.maxConcurrentJobs,
                activeJobs = 0,
                generatedCount = 0,
                skippedCount = 0,
                inferredCount = 0,
                validatedCount = 0,
                failedCount = 0,
                queuedCount = 0,
                note = "Phase 1 fingerprint discovery run. Existing buckets can be skipped while still expanding from a saved example.",
            )
        val runtime =
            RunRuntime(
                request = request,
                cancelled = AtomicBoolean(false),
                snapshot = AtomicReference(initialSnapshot),
            )
        currentRun.set(runtime)
        coordinatorExecutor.submit { run(runtime) }
        return initialSnapshot
    }

    fun getCurrentRun(): StitchingDiscoverySnapshot? = currentRun.get()?.snapshot?.get()

    fun stopRun(): StitchingDiscoverySnapshot? {
        val runtime = currentRun.get() ?: return null
        runtime.cancelled.set(true)
        runtime.snapshot.updateAndGet { snapshot ->
            if (snapshot.state == StitchingDiscoveryRunState.RUNNING) {
                snapshot.copy(
                    state = StitchingDiscoveryRunState.STOPPING,
                    note = "Stop requested. The active generation will finish before the scheduler halts.",
                    updatedAt = Instant.now(),
                )
            } else {
                snapshot
            }
        }
        return runtime.snapshot.get()
    }

    private fun run(runtime: RunRuntime) {
        try {
            val seed = stitchingPreviewService.generateSeedBoard()
            val seedId = "seed:${runtime.snapshot.get().runId}"
            synchronized(runtime.lock) {
                expandFromSource(
                    runtime = runtime,
                    sourceId = seedId,
                    queenPositions = seed.queenPositions,
                    sourceDescription = "Generated 7x7 seed puzzle",
                )
            }

            val active = mutableMapOf<String, CompletableFuture<Unit>>()
            val maxConcurrentJobs = runtime.request.maxConcurrentJobs.coerceAtLeast(1)

            while (true) {
                if (runtime.cancelled.get()) break
                val shouldStopForLimit =
                    synchronized(runtime.lock) { runtime.generatedCount >= runtime.request.generationLimit }
                if (shouldStopForLimit) break

                while (!runtime.cancelled.get() && active.size < maxConcurrentJobs) {
                    val bucketKey =
                        synchronized(runtime.lock) {
                            if (runtime.generatedCount >= runtime.request.generationLimit || runtime.queue.isEmpty()) {
                                null
                            } else {
                                val nextBucketKey = runtime.queue.removeFirst()
                                val bucket = runtime.buckets.getValue(nextBucketKey)
                                runtime.activeBucketKeys.add(nextBucketKey)
                                updateBucketLocked(runtime, bucket.copy(state = StitchingDiscoveryBucketState.QUEUED))
                                nextBucketKey
                            }
                        } ?: break
                    active[bucketKey] =
                        CompletableFuture.runAsync(
                            { processBucket(runtime, bucketKey) },
                            workerExecutor,
                        ).thenApply { Unit }
                }

                val completedBucketKeys = active.filterValues { it.isDone }.keys.toList()
                completedBucketKeys.forEach { key ->
                    active.remove(key)?.join()
                    synchronized(runtime.lock) {
                        runtime.activeBucketKeys.remove(key)
                        updateSnapshotLocked(runtime)
                    }
                }

                val queueEmpty = synchronized(runtime.lock) { runtime.queue.isEmpty() }
                if (active.isEmpty() && queueEmpty) {
                    break
                }
                if (completedBucketKeys.isEmpty()) {
                    Thread.sleep(50)
                }
            }

            val finalState =
                when {
                    runtime.snapshot.get().state == StitchingDiscoveryRunState.FAILED -> StitchingDiscoveryRunState.FAILED
                    runtime.cancelled.get() -> StitchingDiscoveryRunState.INTERRUPTED
                    runtime.generatedCount >= runtime.request.generationLimit -> StitchingDiscoveryRunState.COMPLETED
                    else -> StitchingDiscoveryRunState.COMPLETED
                }
            runtime.snapshot.updateAndGet { snapshot ->
                snapshot.copy(
                    state = finalState,
                    activeJobs = synchronized(runtime.lock) { runtime.activeBucketKeys.size },
                    queuedCount = synchronized(runtime.lock) { runtime.queue.size },
                    activeBucket = null,
                    note =
                        if (runtime.cancelled.get()) {
                            "Discovery interrupted by user request."
                        } else if (runtime.generatedCount >= runtime.request.generationLimit) {
                            "Generation limit reached. Discovery can be resumed in a later run."
                        } else if (runtime.queue.isEmpty()) {
                            "Queue exhausted. No new reachable fingerprint buckets remain from this run."
                        } else {
                            snapshot.note
                        },
                    updatedAt = Instant.now(),
                )
            }
        } catch (error: Exception) {
            runtime.snapshot.updateAndGet { snapshot ->
                snapshot.copy(
                    state = StitchingDiscoveryRunState.FAILED,
                    note = error.stackTraceToString(),
                    updatedAt = Instant.now(),
                )
            }
        }
    }

    private fun processBucket(runtime: RunRuntime, bucketKey: String) {
        val bucket =
            synchronized(runtime.lock) {
                runtime.buckets.getValue(bucketKey).also { currentBucket ->
                    runtime.snapshot.updateAndGet { snapshot ->
                        snapshot.copy(activeBucket = currentBucket, updatedAt = Instant.now())
                    }
                }
            }

        if (runtime.request.skipSatisfiedBuckets) {
            val existing = stitchingCatalogService.getPiecesByFingerprintKey(bucket.fingerprintKey).firstOrNull()
            if (existing != null) {
                synchronized(runtime.lock) {
                    runtime.skippedCount += 1
                    val skipped =
                        bucket.copy(
                            state = StitchingDiscoveryBucketState.SKIPPED,
                            message = "Existing bucket already satisfied; expanded from saved puzzle.",
                            puzzleId = existing.id.toString(),
                            canonicalSignature = existing.canonicalSignature,
                        )
                    updateBucketLocked(runtime, skipped)
                }
                expandFromExistingPuzzle(runtime, existing, "existing:${existing.id}")
                return
            }
        }

        try {
            val resolvedTargetQueenCount =
                stitchingCatalogService.knownMaxQueenCountForFingerprintKey(bucket.fingerprintKey)
                    ?: bucket.targetQueenCount
            val generated =
                stitchingPreviewService.generateCatalogPiece(
                    pieceKind = bucket.pieceKind,
                    leftBlackoutSignature = bucket.leftBlackoutSignature,
                    topBlackoutSignature = bucket.topBlackoutSignature,
                    targetQueenCount = resolvedTargetQueenCount,
                    allowTargetFallbackToMax = true,
                    randomSeed = bucket.bucketKey.hashCode().toLong(),
                )
            val canonicalSignature =
                canonicalPuzzleSignatureService.computeSignature(generated.layout, generated.queens)
            val saved =
                stitchingCatalogService.savePiece(
                    PersistedStitchingPuzzle(
                        id = UUID.randomUUID(),
                        size = StitchingPreviewService.BASE_SIZE,
                        layout = generated.layout,
                        queens = generated.queens,
                        targetQueenCount = generated.targetQueenCount,
                        queenCount = generated.queenCount,
                        orthogonalMinDistance = StitchingPreviewService.ORTHOGONAL_MIN_DISTANCE,
                        minimumGroupSize = StitchingPreviewService.MINIMUM_GROUP_SIZE,
                        generationStrategy = StitchingPreviewService.GENERATION_STRATEGY,
                        pieceKind = generated.pieceKind,
                        leftBlackoutSignature = generated.leftBlackoutSignature,
                        topBlackoutSignature = generated.topBlackoutSignature,
                        leftBlackoutFingerprint = stitchingFingerprintService.fingerprintForSignature(generated.leftBlackoutSignature),
                        topBlackoutFingerprint = stitchingFingerprintService.fingerprintForSignature(generated.topBlackoutSignature),
                        fingerprintKey = bucket.fingerprintKey,
                        pieceCategory = bucket.pieceCategory,
                        canonicalSignature = canonicalSignature,
                        createdAt = Instant.now(),
                    ),
                )

            val generatedBucket =
                bucket.copy(
                    state = if (saved.state == "SAVED") StitchingDiscoveryBucketState.GENERATED else StitchingDiscoveryBucketState.SKIPPED,
                    targetQueenCount = generated.targetQueenCount,
                    message =
                        buildString {
                            append(saved.message ?: "Saved to stitching catalog.")
                            if (generated.targetQueenCount != bucket.targetQueenCount) {
                                append(" Resolved target adjusted from ${bucket.targetQueenCount} to ${generated.targetQueenCount}.")
                            }
                            if (resolvedTargetQueenCount != bucket.targetQueenCount &&
                                resolvedTargetQueenCount == generated.targetQueenCount
                            ) {
                                append(" Reused cached max queen count for this fingerprint.")
                            }
                        },
                    puzzleId = saved.puzzle?.id?.toString(),
                    canonicalSignature = saved.puzzle?.canonicalSignature ?: canonicalSignature,
                )
            synchronized(runtime.lock) {
                runtime.generatedCount += if (saved.state == "SAVED") 1 else 0
                updateBucketLocked(runtime, generatedBucket)
            }
            val puzzleToExpand = saved.puzzle
            if (puzzleToExpand != null) {
                expandFromExistingPuzzle(runtime, puzzleToExpand, "generated:${puzzleToExpand.id}")
            }
        } catch (error: Exception) {
            synchronized(runtime.lock) {
                updateBucketLocked(
                    runtime,
                    bucket.copy(
                        state = StitchingDiscoveryBucketState.FAILED,
                        message = error.stackTraceToString(),
                    ),
                )
            }
        }
    }

    private fun expandFromExistingPuzzle(
        runtime: RunRuntime,
        puzzle: PersistedStitchingPuzzle,
        sourceId: String,
    ) {
        val queens = stitchingPreviewService.decodeQueenPositions(puzzle.queens)
        synchronized(runtime.lock) {
            expandFromSource(runtime, sourceId, queens, "Bucket ${puzzle.fingerprintKey}")
        }
    }

    private fun expandFromSource(
        runtime: RunRuntime,
        sourceId: String,
        queenPositions: Collection<com.queens.admin.domain.model.Position>,
        sourceDescription: String,
    ) {
        val outgoing = stitchingPreviewService.computeOutgoingFingerprints(queenPositions)
        val rightSerialized = serializeSignature(outgoing.rightSignature)
        val bottomSerialized = serializeSignature(outgoing.bottomSignature)

        if (outgoing.rightSignature.any { it > 0 }) {
            runtime.knownLeftOutputs.putIfAbsent(rightSerialized, "$sourceDescription via right output")
            enqueueBucket(
                runtime,
                category = "LEFT_ONLY",
                pieceKind = "TOP_RIGHT",
                leftSignature = outgoing.rightSignature,
                topSignature = List(StitchingPreviewService.BASE_SIZE) { 0 },
                targetQueenCount = StitchingPreviewService.DEPENDENT_TARGET_QUEEN_COUNT,
                provenance = listOf("$sourceDescription via right output"),
            )
        }

        if (outgoing.bottomSignature.any { it > 0 }) {
            runtime.knownTopOutputs.putIfAbsent(bottomSerialized, "$sourceDescription via bottom output")
            enqueueBucket(
                runtime,
                category = "TOP_ONLY",
                pieceKind = "BOTTOM_LEFT",
                leftSignature = List(StitchingPreviewService.BASE_SIZE) { 0 },
                topSignature = outgoing.bottomSignature,
                targetQueenCount = StitchingPreviewService.DEPENDENT_TARGET_QUEEN_COUNT,
                provenance = listOf("$sourceDescription via bottom output"),
            )
        }

        if (outgoing.rightSignature.any { it > 0 }) {
            runtime.knownTopOutputs.forEach { (topSig, topProvenance) ->
                enqueueBucket(
                    runtime,
                    category = "BOTH",
                    pieceKind = "BOTTOM_RIGHT",
                    leftSignature = outgoing.rightSignature,
                    topSignature = parseSignature(topSig),
                    targetQueenCount = StitchingPreviewService.DEPENDENT_TARGET_QUEEN_COUNT,
                    provenance = listOf("$sourceDescription via right output", topProvenance),
                )
            }
        }

        if (outgoing.bottomSignature.any { it > 0 }) {
            runtime.knownLeftOutputs.forEach { (leftSig, leftProvenance) ->
                enqueueBucket(
                    runtime,
                    category = "BOTH",
                    pieceKind = "BOTTOM_RIGHT",
                    leftSignature = parseSignature(leftSig),
                    topSignature = outgoing.bottomSignature,
                    targetQueenCount = StitchingPreviewService.DEPENDENT_TARGET_QUEEN_COUNT,
                    provenance = listOf(leftProvenance, "$sourceDescription via bottom output"),
                )
            }
        }
    }

    private fun enqueueBucket(
        runtime: RunRuntime,
        category: String,
        pieceKind: String,
        leftSignature: List<Int>,
        topSignature: List<Int>,
        targetQueenCount: Int,
        provenance: List<String>,
    ) {
        val leftFingerprint = stitchingFingerprintService.fingerprintForSignature(leftSignature)
        val topFingerprint = stitchingFingerprintService.fingerprintForSignature(topSignature)
        if (category == "LEFT_ONLY" && leftFingerprint.isBlank()) return
        if (category == "TOP_ONLY" && topFingerprint.isBlank()) return
        if (category == "BOTH" && (leftFingerprint.isBlank() || topFingerprint.isBlank())) return

        val fingerprintKey = stitchingFingerprintService.fingerprintKey(leftFingerprint, topFingerprint)
        val bucketKey = "$category|$fingerprintKey"
        val existing = runtime.buckets[bucketKey]
        if (existing != null) {
            runtime.buckets[bucketKey] =
                existing.copy(provenance = (existing.provenance + provenance).distinct())
            updateSnapshotLocked(runtime)
            return
        }

        val snapshot =
            StitchingDiscoveryBucketSnapshot(
                bucketKey = bucketKey,
                pieceCategory = category,
                pieceKind = pieceKind,
                fingerprintKey = fingerprintKey,
                leftBlackoutSignature = leftSignature,
                topBlackoutSignature = topSignature,
                targetQueenCount = targetQueenCount,
                state = StitchingDiscoveryBucketState.INFERRED,
                provenance = provenance.distinct(),
            )
        runtime.buckets[bucketKey] = snapshot
        runtime.queue.addLast(bucketKey)
        updateSnapshotLocked(runtime)
    }

    private fun updateBucket(runtime: RunRuntime, bucket: StitchingDiscoveryBucketSnapshot) {
        synchronized(runtime.lock) {
            updateBucketLocked(runtime, bucket)
        }
    }

    private fun updateBucketLocked(runtime: RunRuntime, bucket: StitchingDiscoveryBucketSnapshot) {
        runtime.buckets[bucket.bucketKey] = bucket
        updateSnapshotLocked(runtime)
    }

    private fun updateSnapshotLocked(runtime: RunRuntime) {
        runtime.snapshot.updateAndGet { current ->
            current.copy(
                activeJobs = runtime.activeBucketKeys.size,
                generatedCount = runtime.generatedCount,
                skippedCount = runtime.skippedCount,
                inferredCount = runtime.buckets.size,
                validatedCount =
                    runtime.buckets.values.count {
                        it.state == StitchingDiscoveryBucketState.GENERATED ||
                            it.state == StitchingDiscoveryBucketState.SKIPPED
                    },
                failedCount = runtime.buckets.values.count { it.state == StitchingDiscoveryBucketState.FAILED },
                queuedCount = runtime.queue.size,
                generatedBuckets =
                    runtime.buckets.values.toList().filter { it.state == StitchingDiscoveryBucketState.GENERATED }.takeLast(100),
                skippedBuckets =
                    runtime.buckets.values.toList().filter { it.state == StitchingDiscoveryBucketState.SKIPPED }.takeLast(100),
                failedBuckets =
                    runtime.buckets.values.toList().filter { it.state == StitchingDiscoveryBucketState.FAILED }.takeLast(100),
                queuedBuckets = runtime.queue.mapNotNull(runtime.buckets::get).take(50),
                inferredBuckets = runtime.buckets.values.toList().takeLast(100),
                activeBucket =
                    runtime.activeBucketKeys.firstOrNull()
                        ?.let(runtime.buckets::get)
                        ?: current.activeBucket?.let { active -> runtime.buckets[active.bucketKey] }
                            ?.takeIf { it.state == StitchingDiscoveryBucketState.QUEUED },
                updatedAt = Instant.now(),
            )
        }
    }

    private fun serializeSignature(signature: List<Int>): String = signature.joinToString(",")

    private fun parseSignature(serialized: String): List<Int> = serialized.split(",").map(String::toInt)

    private data class RunRuntime(
        val request: StitchingDiscoveryRequest,
        val cancelled: AtomicBoolean,
        val snapshot: AtomicReference<StitchingDiscoverySnapshot>,
        val lock: Any = Any(),
        val queue: ArrayDeque<String> = ArrayDeque(),
        val buckets: LinkedHashMap<String, StitchingDiscoveryBucketSnapshot> = linkedMapOf(),
        val knownLeftOutputs: LinkedHashMap<String, String> = linkedMapOf(),
        val knownTopOutputs: LinkedHashMap<String, String> = linkedMapOf(),
        val activeBucketKeys: LinkedHashSet<String> = linkedSetOf(),
        var generatedCount: Int = 0,
        var skippedCount: Int = 0,
    )
}
