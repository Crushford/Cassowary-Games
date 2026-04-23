package com.queens.admin.api

import com.queens.admin.api.dto.StitchingBatchRequestDto
import com.queens.admin.api.dto.StitchingBatchRunDto
import com.queens.admin.api.dto.StitchingBatchStartedDto
import com.queens.admin.api.dto.StitchingBatchStatusDto
import com.queens.admin.api.dto.StitchingCatalogBucketStatsDto
import com.queens.admin.api.dto.StitchingCatalogDeleteDto
import com.queens.admin.api.dto.StitchingCatalogExportDto
import com.queens.admin.api.dto.StitchingDiscoveryBucketDto
import com.queens.admin.api.dto.StitchingDiscoveryRequestDto
import com.queens.admin.api.dto.StitchingDiscoveryStatusDto
import com.queens.admin.api.dto.StitchingFingerprintSpaceDto
import com.queens.admin.api.dto.StitchingCatalogStatsDto
import com.queens.admin.application.StitchingBatchRequest
import com.queens.admin.application.StitchingBatchRunRequest
import com.queens.admin.application.StitchingBatchService
import com.queens.admin.application.StitchingCatalogService
import com.queens.admin.application.StitchingDiscoveryService
import com.queens.admin.application.StitchingFingerprintSpaceService
import com.queens.admin.application.StitchingJsonExportService
import java.nio.file.Path
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/stitching")
class StitchingCatalogController(
    private val stitchingBatchService: StitchingBatchService,
    private val stitchingCatalogService: StitchingCatalogService,
    private val stitchingDiscoveryService: StitchingDiscoveryService,
    private val stitchingFingerprintSpaceService: StitchingFingerprintSpaceService,
    private val stitchingJsonExportService: StitchingJsonExportService,
) {
    @PostMapping("/batch/start")
    fun startBatch(@RequestBody request: StitchingBatchRequestDto): StitchingBatchStartedDto =
        StitchingBatchStartedDto(
            batchId =
                stitchingBatchService.startBatch(
                    StitchingBatchRequest(
                        size = request.size,
                        orthogonalMinDistance = request.orthogonalMinDistance,
                        minimumGroupSize = request.minimumGroupSize,
                        runsPerFingerprint = request.runsPerFingerprint,
                        maxConcurrentJobs = request.maxConcurrentJobs,
                        preset = request.preset,
                        runs =
                            request.runs.map { run ->
                                StitchingBatchRunRequest(
                                    pieceKind = run.pieceKind,
                                    leftBlackoutSignature = run.leftBlackoutSignature,
                                    topBlackoutSignature = run.topBlackoutSignature,
                                    targetQueenCount = run.targetQueenCount,
                                )
                            },
                    ),
                ).batchId,
        )

    @GetMapping("/fingerprint-space")
    fun getFingerprintSpace(): StitchingFingerprintSpaceDto {
        val snapshot = stitchingFingerprintSpaceService.snapshot()
        return StitchingFingerprintSpaceDto(
            leftOnlyFingerprintCount = snapshot.leftOnlyFingerprintCount,
            topOnlyFingerprintCount = snapshot.topOnlyFingerprintCount,
            bothFingerprintCount = snapshot.bothFingerprintCount,
            totalFingerprintCount = snapshot.totalFingerprintCount,
        )
    }

    @PostMapping("/discovery/start")
    fun startDiscovery(@RequestBody request: StitchingDiscoveryRequestDto): StitchingDiscoveryStatusDto =
        stitchingDiscoveryService.startRun(
            com.queens.admin.application.StitchingDiscoveryRequest(
                generationLimit = request.generationLimit,
                skipSatisfiedBuckets = request.skipSatisfiedBuckets,
                maxConcurrentJobs = request.maxConcurrentJobs,
                minRegionSize = request.minRegionSize,
            ),
        ).toDto()

    @GetMapping("/discovery")
    fun getDiscovery(): ResponseEntity<StitchingDiscoveryStatusDto> =
        ResponseEntity.ok(
            stitchingDiscoveryService.getCurrentRun()?.toDto() ?: idleDiscoveryStatusDto(),
        )

    @PostMapping("/discovery/stop")
    fun stopDiscovery(): ResponseEntity<StitchingDiscoveryStatusDto> =
        ResponseEntity.ok(
            stitchingDiscoveryService.stopRun()?.toDto() ?: idleDiscoveryStatusDto(),
        )

    @GetMapping("/batch/{batchId}")
    fun getBatchStatus(@PathVariable batchId: String): ResponseEntity<StitchingBatchStatusDto> {
        val snapshot = stitchingBatchService.getBatchStatus(batchId) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(
            StitchingBatchStatusDto(
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
                note = snapshot.note,
                runs =
                    snapshot.runs.map { run ->
                        StitchingBatchRunDto(
                            runId = run.runId,
                            pieceKind = run.pieceKind,
                            leftBlackoutSignature = run.leftBlackoutSignature,
                            topBlackoutSignature = run.topBlackoutSignature,
                            leftBlackoutFingerprint = run.leftBlackoutFingerprint,
                            topBlackoutFingerprint = run.topBlackoutFingerprint,
                            fingerprintKey = run.fingerprintKey,
                            pieceCategory = run.pieceCategory,
                            targetQueenCount = run.targetQueenCount,
                            state = run.state.name,
                            queenCount = run.queenCount,
                            canonicalSignature = run.canonicalSignature,
                            savedPuzzleId = run.savedPuzzleId,
                            persistenceState = run.persistenceState,
                            persistenceMessage = run.persistenceMessage,
                            error = run.error,
                            startedAt = run.startedAt?.toString(),
                            finishedAt = run.finishedAt?.toString(),
                        )
                    },
                updatedAt = snapshot.updatedAt.toString(),
            ),
        )
    }

    @PostMapping("/batch/{batchId}/cancel")
    fun cancelBatch(@PathVariable batchId: String): ResponseEntity<StitchingBatchStatusDto> {
        val snapshot = stitchingBatchService.cancelBatch(batchId) ?: return ResponseEntity.notFound().build()
        return getBatchStatus(snapshot.batchId)
    }

    @GetMapping("/batch")
    fun listBatches(): List<StitchingBatchStatusDto> =
        stitchingBatchService.getAllBatches().map { snapshot ->
            StitchingBatchStatusDto(
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
                note = snapshot.note,
                runs =
                    snapshot.runs.map { run ->
                        StitchingBatchRunDto(
                            runId = run.runId,
                            pieceKind = run.pieceKind,
                            leftBlackoutSignature = run.leftBlackoutSignature,
                            topBlackoutSignature = run.topBlackoutSignature,
                            leftBlackoutFingerprint = run.leftBlackoutFingerprint,
                            topBlackoutFingerprint = run.topBlackoutFingerprint,
                            fingerprintKey = run.fingerprintKey,
                            pieceCategory = run.pieceCategory,
                            targetQueenCount = run.targetQueenCount,
                            state = run.state.name,
                            queenCount = run.queenCount,
                            canonicalSignature = run.canonicalSignature,
                            savedPuzzleId = run.savedPuzzleId,
                            persistenceState = run.persistenceState,
                            persistenceMessage = run.persistenceMessage,
                            error = run.error,
                            startedAt = run.startedAt?.toString(),
                            finishedAt = run.finishedAt?.toString(),
                        )
                    },
                updatedAt = snapshot.updatedAt.toString(),
            )
        }

    @GetMapping("/catalog/stats")
    fun getCatalogStats(): StitchingCatalogStatsDto {
        val buckets =
            stitchingCatalogService.countByFingerprintKey()
                .groupBy { it.fingerprintKey }
                .values
                .map { entries ->
                    val sample = entries.first()
                    StitchingCatalogBucketStatsDto(
                        boardSize = sample.size,
                        orthogonalMinDistance = sample.orthogonalMinDistance,
                        targetQueenCount = sample.targetQueenCount,
                        pieceCategory = sample.pieceCategory,
                        leftBlackoutFingerprint = sample.leftBlackoutFingerprint,
                        topBlackoutFingerprint = sample.topBlackoutFingerprint,
                        fingerprintKey = sample.fingerprintKey,
                        puzzleCount = entries.sumOf { it.count },
                        countsByPieceKind = entries.associate { it.pieceKind to it.count }.toSortedMap(),
                    )
                }
                .sortedBy { it.fingerprintKey }

        return StitchingCatalogStatsDto(
            totalPuzzles = buckets.sumOf { it.puzzleCount },
            bucketCount = buckets.size,
            buckets = buckets,
        )
    }

    @PostMapping("/catalog/export")
    fun exportCatalog(): StitchingCatalogExportDto {
        val summary = stitchingJsonExportService.exportCatalogs(defaultExportPuzzleDirectory())
        return StitchingCatalogExportDto(
            outputPath = summary.outputDirectory.toString(),
            bucketCount = summary.fingerprintBucketCount,
            puzzleCount = summary.puzzleCount,
        )
    }

    @PostMapping("/catalog/delete-blackout-puzzles")
    fun deleteBlackoutPuzzles(): StitchingCatalogDeleteDto =
        StitchingCatalogDeleteDto(
            deletedCount = stitchingCatalogService.deleteBlackoutPuzzles(),
        )

    private fun defaultExportPuzzleDirectory(): Path {
        val candidates =
            listOf(
                Path.of("frontend/public/queens"),
                Path.of("../frontend/public/queens"),
            )
        return candidates.firstOrNull { it.toFile().exists() } ?: candidates.first()
    }

    private fun com.queens.admin.application.StitchingDiscoverySnapshot.toDto(): StitchingDiscoveryStatusDto =
        StitchingDiscoveryStatusDto(
            runId = runId,
            state = state.name,
            generationLimit = generationLimit,
            skipSatisfiedBuckets = skipSatisfiedBuckets,
            maxConcurrentJobs = maxConcurrentJobs,
            activeJobs = activeJobs,
            generatedCount = generatedCount,
            skippedCount = skippedCount,
            inferredCount = inferredCount,
            validatedCount = validatedCount,
            failedCount = failedCount,
            queuedCount = queuedCount,
            activeBucket = activeBucket?.toDto(),
            generatedBuckets = generatedBuckets.map { it.toDto() },
            skippedBuckets = skippedBuckets.map { it.toDto() },
            failedBuckets = failedBuckets.map { it.toDto() },
            queuedBuckets = queuedBuckets.map { it.toDto() },
            inferredBuckets = inferredBuckets.map { it.toDto() },
            note = note,
            updatedAt = updatedAt.toString(),
        )

    private fun com.queens.admin.application.StitchingDiscoveryBucketSnapshot.toDto(): StitchingDiscoveryBucketDto =
        StitchingDiscoveryBucketDto(
            bucketKey = bucketKey,
            pieceCategory = pieceCategory,
            pieceKind = pieceKind,
            fingerprintKey = fingerprintKey,
            leftBlackoutSignature = leftBlackoutSignature,
            topBlackoutSignature = topBlackoutSignature,
            targetQueenCount = targetQueenCount,
            state = state.name,
            provenance = provenance,
            message = message,
            puzzleId = puzzleId,
            canonicalSignature = canonicalSignature,
        )

    private fun idleDiscoveryStatusDto(): StitchingDiscoveryStatusDto =
        StitchingDiscoveryStatusDto(
            runId = "",
            state = "IDLE",
            generationLimit = 0,
            skipSatisfiedBuckets = true,
            maxConcurrentJobs = 1,
            activeJobs = 0,
            generatedCount = 0,
            skippedCount = 0,
            inferredCount = 0,
            validatedCount = 0,
            failedCount = 0,
            queuedCount = 0,
            activeBucket = null,
            generatedBuckets = emptyList(),
            skippedBuckets = emptyList(),
            failedBuckets = emptyList(),
            queuedBuckets = emptyList(),
            inferredBuckets = emptyList(),
            note = null,
            updatedAt = java.time.Instant.now().toString(),
        )
}
