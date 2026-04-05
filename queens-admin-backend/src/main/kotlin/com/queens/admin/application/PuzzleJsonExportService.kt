package com.queens.admin.application

import com.fasterxml.jackson.databind.ObjectMapper
import java.nio.file.Files
import java.nio.file.Path
import org.springframework.stereotype.Service

@Service
class PuzzleJsonExportService(
    private val objectMapper: ObjectMapper,
    private val puzzleCatalogService: PuzzleCatalogService,
) {
    companion object {
        const val CLASSIC_EXPORT_FILE = "puzzles.json"
        const val EXTENDED_EXPORT_FILE = "extendedPuzzles.json"
    }

    data class ExportSummary(
        val classicOutputPath: Path,
        val extendedOutputPath: Path,
        val classicSizeBucketCount: Int,
        val extendedSizeBucketCount: Int,
        val classicPuzzleCount: Int,
        val extendedPuzzleCount: Int,
    )

    fun exportCatalogs(directory: Path): ExportSummary {
        val puzzles = puzzleCatalogService.findAll()
        val classicPuzzles = puzzles.filter(::isClassicPuzzle)
        val extendedPuzzles = puzzles.filterNot(::isClassicPuzzle)
        val classicPath = directory.resolve(CLASSIC_EXPORT_FILE)
        val extendedPath = directory.resolve(EXTENDED_EXPORT_FILE)

        val classicGrouped = groupForExport(classicPuzzles)
        val extendedGrouped = groupForExport(extendedPuzzles)

        writeGrouped(classicPath, classicGrouped)
        writeGrouped(extendedPath, extendedGrouped)

        return ExportSummary(
            classicOutputPath = classicPath,
            extendedOutputPath = extendedPath,
            classicSizeBucketCount = classicGrouped.size,
            extendedSizeBucketCount = extendedGrouped.size,
            classicPuzzleCount = classicPuzzles.size,
            extendedPuzzleCount = extendedPuzzles.size,
        )
    }

    private fun groupForExport(puzzles: List<com.queens.admin.domain.model.PersistedPuzzle>): LinkedHashMap<String, MutableList<Map<String, Any>>> {
        val grouped = linkedMapOf<String, MutableList<Map<String, Any>>>()
        puzzles.forEach { puzzle ->
            val sizeKey = "${puzzle.size}x${puzzle.size}"
            val bucket = grouped.getOrPut(sizeKey) { mutableListOf() }
            val row = linkedMapOf(
                "id" to puzzle.id.toString(),
                "layout" to puzzle.layout,
                "queens" to puzzle.queens,
                "targetQueenCount" to puzzle.targetQueenCount,
                "orthogonalMinDistance" to puzzle.orthogonalMinDistance,
            )
            puzzle.difficultyTier?.let { row["difficulty"] = it.name.lowercase() }
            bucket += row
        }
        return grouped
    }

    private fun writeGrouped(path: Path, grouped: LinkedHashMap<String, MutableList<Map<String, Any>>>) {
        path.parent?.let { Files.createDirectories(it) }
        Files.newBufferedWriter(path).use { writer ->
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(writer, grouped)
        }
    }

    private fun isClassicPuzzle(puzzle: com.queens.admin.domain.model.PersistedPuzzle): Boolean =
        puzzle.targetQueenCount == puzzle.size && puzzle.orthogonalMinDistance == puzzle.size
}
