package com.queens.admin.api.dto

data class StitchingBatchRunRequestDto(
    val pieceKind: String,
    val leftBlackoutSignature: List<Int>,
    val topBlackoutSignature: List<Int>,
    val targetQueenCount: Int,
)

data class StitchingBatchRequestDto(
    val size: Int = 7,
    val orthogonalMinDistance: Int = 5,
    val minimumGroupSize: Int = 3,
    val runsPerFingerprint: Int,
    val maxConcurrentJobs: Int,
    val preset: String? = null,
    val runs: List<StitchingBatchRunRequestDto>,
)

data class StitchingBatchStartedDto(
    val batchId: String,
)

data class StitchingBatchRunDto(
    val runId: String,
    val pieceKind: String,
    val leftBlackoutSignature: List<Int>,
    val topBlackoutSignature: List<Int>,
    val leftBlackoutFingerprint: String,
    val topBlackoutFingerprint: String,
    val fingerprintKey: String,
    val pieceCategory: String,
    val targetQueenCount: Int,
    val state: String,
    val queenCount: Int?,
    val canonicalSignature: String?,
    val savedPuzzleId: String?,
    val persistenceState: String?,
    val persistenceMessage: String?,
    val error: String?,
    val startedAt: String?,
    val finishedAt: String?,
)

data class StitchingBatchStatusDto(
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
    val note: String?,
    val runs: List<StitchingBatchRunDto>,
    val updatedAt: String,
)

data class StitchingCatalogBucketStatsDto(
    val boardSize: Int,
    val orthogonalMinDistance: Int,
    val targetQueenCount: Int,
    val pieceCategory: String,
    val leftBlackoutFingerprint: String,
    val topBlackoutFingerprint: String,
    val fingerprintKey: String,
    val puzzleCount: Int,
    val countsByPieceKind: Map<String, Int>,
)

data class StitchingCatalogStatsDto(
    val totalPuzzles: Int,
    val bucketCount: Int,
    val buckets: List<StitchingCatalogBucketStatsDto>,
)

data class StitchingCatalogExportDto(
    val outputPath: String,
    val bucketCount: Int,
    val puzzleCount: Int,
)

data class StitchingCatalogDeleteDto(
    val deletedCount: Int,
)

data class StitchingFingerprintSpaceDto(
    val leftOnlyFingerprintCount: Int,
    val topOnlyFingerprintCount: Int,
    val bothFingerprintCount: Long,
    val totalFingerprintCount: Long,
)

data class StitchingDiscoveryRequestDto(
    val generationLimit: Int,
    val skipSatisfiedBuckets: Boolean = true,
    val maxConcurrentJobs: Int = 1,
)

data class StitchingDiscoveryBucketDto(
    val bucketKey: String,
    val pieceCategory: String,
    val pieceKind: String,
    val fingerprintKey: String,
    val leftBlackoutSignature: List<Int>,
    val topBlackoutSignature: List<Int>,
    val targetQueenCount: Int,
    val state: String,
    val provenance: List<String>,
    val message: String?,
    val puzzleId: String?,
    val canonicalSignature: String?,
)

data class StitchingDiscoveryStatusDto(
    val runId: String,
    val state: String,
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
    val activeBucket: StitchingDiscoveryBucketDto?,
    val generatedBuckets: List<StitchingDiscoveryBucketDto>,
    val skippedBuckets: List<StitchingDiscoveryBucketDto>,
    val failedBuckets: List<StitchingDiscoveryBucketDto>,
    val queuedBuckets: List<StitchingDiscoveryBucketDto>,
    val inferredBuckets: List<StitchingDiscoveryBucketDto>,
    val note: String?,
    val updatedAt: String,
)
