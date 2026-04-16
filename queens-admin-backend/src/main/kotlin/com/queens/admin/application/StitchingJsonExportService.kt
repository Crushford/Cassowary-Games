package com.queens.admin.application

import com.fasterxml.jackson.databind.ObjectMapper
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.deleteIfExists
import org.springframework.stereotype.Service

@Service
class StitchingJsonExportService(
    private val objectMapper: ObjectMapper,
    private val stitchingCatalogService: StitchingCatalogService,
) {
    companion object {
        const val EXPORT_DIRECTORY = "stitching"
        const val INDEX_FILE = "index.json"
    }

    data class BucketIndexEntry(
        val boardSize: Int,
        val orthogonalMinDistance: Int,
        val targetQueenCount: Int,
        val leftBlackoutFingerprint: String,
        val topBlackoutFingerprint: String,
        val fingerprintKey: String,
        val pieceCategory: String,
        val puzzleCount: Int,
        val countsByPieceKind: Map<String, Int>,
        val path: String,
    )

    data class ExportSummary(
        val outputDirectory: Path,
        val bucketCount: Int,
        val puzzleCount: Int,
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
        val grouped = puzzles.groupBy { it.fingerprintKey }
        val indexEntries =
            grouped.entries
                .sortedBy { it.key }
                .map { (fingerprintKey, bucketPuzzles) ->
                    val sample = bucketPuzzles.first()
                    val outputPath = outputDirectory.resolve("${sanitizeBucketName(fingerprintKey)}.json")
                    Files.newBufferedWriter(outputPath).use { writer ->
                        objectMapper.writerWithDefaultPrettyPrinter().writeValue(
                            writer,
                            bucketPuzzles.map { puzzle ->
                                linkedMapOf(
                                    "id" to puzzle.id.toString(),
                                    "layout" to puzzle.layout,
                                    "queens" to puzzle.queens,
                                    "pieceKind" to puzzle.pieceKind,
                                    "pieceCategory" to puzzle.pieceCategory,
                                    "boardSize" to puzzle.size,
                                    "orthogonalMinDistance" to puzzle.orthogonalMinDistance,
                                    "targetQueenCount" to puzzle.targetQueenCount,
                                    "queenCount" to puzzle.queenCount,
                                    "leftBlackoutSignature" to puzzle.leftBlackoutSignature,
                                    "topBlackoutSignature" to puzzle.topBlackoutSignature,
                                    "leftBlackoutFingerprint" to puzzle.leftBlackoutFingerprint,
                                    "topBlackoutFingerprint" to puzzle.topBlackoutFingerprint,
                                    "fingerprintKey" to puzzle.fingerprintKey,
                                    "generationStrategy" to puzzle.generationStrategy,
                                )
                            },
                        )
                    }

                    BucketIndexEntry(
                        boardSize = sample.size,
                        orthogonalMinDistance = sample.orthogonalMinDistance,
                        targetQueenCount = sample.targetQueenCount,
                        leftBlackoutFingerprint = sample.leftBlackoutFingerprint,
                        topBlackoutFingerprint = sample.topBlackoutFingerprint,
                        fingerprintKey = sample.fingerprintKey,
                        pieceCategory = sample.pieceCategory,
                        puzzleCount = bucketPuzzles.size,
                        countsByPieceKind = bucketPuzzles.groupingBy { it.pieceKind }.eachCount().toSortedMap(),
                        path = "/queens/$EXPORT_DIRECTORY/${sanitizeBucketName(fingerprintKey)}.json",
                    )
                }

        val indexPath = outputDirectory.resolve(INDEX_FILE)
        Files.newBufferedWriter(indexPath).use { writer ->
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(writer, indexEntries)
        }

        return ExportSummary(
            outputDirectory = outputDirectory,
            bucketCount = indexEntries.size,
            puzzleCount = puzzles.size,
            indexPath = indexPath,
        )
    }

    private fun sanitizeBucketName(fingerprintKey: String): String =
        if (fingerprintKey.isBlank()) "standard" else fingerprintKey.replace(":", "__")
}
