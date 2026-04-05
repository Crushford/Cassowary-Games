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
    data class ExportSummary(
        val outputPath: Path,
        val sizeBucketCount: Int,
        val puzzleCount: Int,
    )

    fun exportToJson(path: Path): ExportSummary {
        val puzzles = puzzleCatalogService.findAll()
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

        path.parent?.let { Files.createDirectories(it) }
        Files.newBufferedWriter(path).use { writer ->
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(writer, grouped)
        }

        return ExportSummary(
            outputPath = path,
            sizeBucketCount = grouped.size,
            puzzleCount = puzzles.size,
        )
    }
}
