package com.queens.admin.application

import com.fasterxml.jackson.databind.ObjectMapper
import com.queens.admin.domain.service.StitchingFingerprintService
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.deleteIfExists
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class StitchingJsonExportService(
    private val objectMapper: ObjectMapper,
    private val stitchingCatalogService: StitchingCatalogService,
    private val stitchingPreviewService: StitchingPreviewService,
    private val stitchingFingerprintService: StitchingFingerprintService,
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    companion object {
        const val EXPORT_DIRECTORY = "stitching"
        const val INDEX_FILE = "index.json"
    }

    data class PuzzleExportRecord(
        val id: String,
        val layout: String,
        val queens: String,
        val pieceKind: String,
        val pieceCategory: String,
        val boardSize: Int,
        val orthogonalMinDistance: Int,
        val targetQueenCount: Int,
        val queenCount: Int,
        val leftBlackoutSignature: List<Int>,
        val topBlackoutSignature: List<Int>,
        val leftBlackoutFingerprint: String,
        val topBlackoutFingerprint: String,
        val rightBleedFingerprint: String,
        val bottomBleedFingerprint: String,
        val fingerprintKey: String,
        val generationStrategy: String,
        val isSeed: Boolean,
        val blackoutFillOverrides: List<BlackoutFillOverrideExportRecord> = emptyList(),
        val effectiveMinGroupSize: Int? = null,
    )

    data class BlackoutFillOverrideExportRecord(
        val row: Int,
        val col: Int,
        val groupSymbol: String,
    )

    data class ExportPayload(
        val byFingerprint: Map<String, List<PuzzleExportRecord>>,
        val startingPuzzles: List<PuzzleExportRecord>,
    )

    data class ExportSummary(
        val outputDirectory: Path,
        val puzzleCount: Int,
        val startingPuzzleCount: Int,
        val fingerprintBucketCount: Int,
        val indexPath: Path,
    )

    fun exportCatalogs(rootDirectory: Path): ExportSummary {
        val outputDirectory = rootDirectory.resolve(EXPORT_DIRECTORY)
        if (Files.exists(outputDirectory)) {
            Files.walk(outputDirectory)
                .sorted(java.util.Comparator.reverseOrder())
                .forEach { path ->
                    if (path != outputDirectory) {
                        path.deleteIfExists()
                    }
                }
            outputDirectory.deleteIfExists()
        }
        Files.createDirectories(outputDirectory)

        val puzzles = stitchingCatalogService.findAll()
        val startingPuzzles = puzzles.filter { it.isSeed }
        val stitchedPuzzles = puzzles.filter { !it.isSeed }

        logger.info(
            "Export stitching catalog: puzzles={}, startingPuzzles={}, stitchedPuzzles={}, uniqueFingerprintKeys={}",
            puzzles.size,
            startingPuzzles.size,
            stitchedPuzzles.size,
            stitchedPuzzles.map { it.fingerprintKey }.distinct().size,
        )

        val byFingerprint =
            stitchedPuzzles
                .groupBy { it.fingerprintKey }
                .toSortedMap()
                .mapValues { (_, bucketPuzzles) -> bucketPuzzles.map { it.toExportRecord() } }

        val payload =
            ExportPayload(
                byFingerprint = byFingerprint,
                startingPuzzles = startingPuzzles.map { it.toExportRecord() },
            )

        val indexPath = outputDirectory.resolve(INDEX_FILE)
        Files.newBufferedWriter(indexPath).use { writer ->
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(writer, payload)
        }

        logger.info(
            "Export stitching catalog complete: buckets={}, startingPuzzles={}, outputDirectory={}",
            byFingerprint.size,
            startingPuzzles.size,
            outputDirectory,
        )

        return ExportSummary(
            outputDirectory = outputDirectory,
            puzzleCount = stitchedPuzzles.size + startingPuzzles.size,
            startingPuzzleCount = startingPuzzles.size,
            fingerprintBucketCount = byFingerprint.size,
            indexPath = indexPath,
        )
    }

    private fun com.queens.admin.domain.model.PersistedStitchingPuzzle.toExportRecord(): PuzzleExportRecord {
        val outgoing =
            stitchingPreviewService.computeOutgoingFingerprints(
                stitchingPreviewService.decodeQueenPositions(queens, size),
            )
        val blackoutFillOverrides =
            stitchingPreviewService.computeBlackoutFillOverrides(
                layout = layout,
                boardSize = size,
                minimumGroupSize = minimumGroupSize,
            )
        val effectiveMinGroupSize =
            stitchingPreviewService.computeEffectiveMinGroupSize(
                layout = layout,
                boardSize = size,
                blackoutFillOverrides = blackoutFillOverrides,
            )
        return PuzzleExportRecord(
            id = id.toString(),
            layout = layout,
            queens = queens,
            pieceKind = pieceKind,
            pieceCategory = pieceCategory,
            boardSize = size,
            orthogonalMinDistance = orthogonalMinDistance,
            targetQueenCount = targetQueenCount,
            queenCount = queenCount,
            leftBlackoutSignature = leftBlackoutSignature,
            topBlackoutSignature = topBlackoutSignature,
            leftBlackoutFingerprint = leftBlackoutFingerprint,
            topBlackoutFingerprint = topBlackoutFingerprint,
            rightBleedFingerprint = outgoing.rightSignature.let { stitchingFingerprintService.rowFingerprintForSignature(it) },
            bottomBleedFingerprint = outgoing.bottomSignature.let { stitchingFingerprintService.columnFingerprintForSignature(it) },
            fingerprintKey = fingerprintKey,
            generationStrategy = generationStrategy,
            isSeed = isSeed,
            blackoutFillOverrides =
                blackoutFillOverrides.map { override ->
                    BlackoutFillOverrideExportRecord(
                        row = override.row,
                        col = override.col,
                        groupSymbol = override.groupSymbol,
                    )
                },
            effectiveMinGroupSize = effectiveMinGroupSize,
        )
    }
}
