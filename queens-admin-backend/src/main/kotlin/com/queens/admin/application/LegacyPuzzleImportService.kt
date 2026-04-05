package com.queens.admin.application

import com.fasterxml.jackson.databind.ObjectMapper
import com.queens.admin.domain.model.PersistedPuzzle
import com.queens.admin.domain.service.CanonicalPuzzleSignatureService
import java.nio.file.Files
import java.nio.file.Path
import java.time.Instant
import java.util.UUID
import org.springframework.stereotype.Service

@Service
class LegacyPuzzleImportService(
    private val objectMapper: ObjectMapper,
    private val puzzleCatalogService: PuzzleCatalogService,
    private val canonicalPuzzleSignatureService: CanonicalPuzzleSignatureService,
) {
    data class ImportSummary(
        val totalRowsSeen: Int,
        val canonicalRowsSeen: Int,
        val importedCount: Int,
        val duplicateCount: Int,
        val skippedVariantCount: Int,
    )

    fun importFromJson(
        path: Path,
        minimumGroupSize: Int = 3,
        generationStrategy: String = "legacy-import",
    ): ImportSummary {
        require(Files.exists(path)) { "Legacy puzzle file does not exist: $path" }

        val root = objectMapper.readTree(Files.newBufferedReader(path))
        require(root.isObject) { "Expected top-level size buckets in legacy puzzle JSON." }

        var totalRowsSeen = 0
        var canonicalRowsSeen = 0
        var importedCount = 0
        var duplicateCount = 0
        var skippedVariantCount = 0

        root.fields().forEach { (_, bucketNode) ->
            require(bucketNode.isArray) { "Each size bucket must contain an array of puzzles." }
            bucketNode.forEach { puzzleNode ->
                totalRowsSeen += 1
                val id = puzzleNode.path("id").asText()
                if (!id.endsWith("-0")) {
                    skippedVariantCount += 1
                    return@forEach
                }

                canonicalRowsSeen += 1
                val layout = puzzleNode.path("layout").asText()
                val queens = puzzleNode.path("queens").asText()
                val size = kotlin.math.sqrt(layout.length.toDouble()).toInt()
                require(size * size == layout.length && queens.length == layout.length) {
                    "Puzzle $id does not contain square layout/queen strings."
                }

                val canonicalSignature = canonicalPuzzleSignatureService.computeSignature(layout, queens)
                if (puzzleCatalogService.findByCanonicalSignature(canonicalSignature) != null) {
                    duplicateCount += 1
                    return@forEach
                }

                puzzleCatalogService.save(
                    PersistedPuzzle(
                        id = UUID.randomUUID(),
                        size = size,
                        layout = layout,
                        queens = queens,
                        targetQueenCount = puzzleNode.path("targetQueenCount").asInt(size),
                        orthogonalMinDistance = puzzleNode.path("orthogonalMinDistance").asInt(size),
                        canonicalSignature = canonicalSignature,
                        minimumGroupSize = minimumGroupSize,
                        generationStrategy = generationStrategy,
                        createdAt = Instant.now(),
                    ),
                )
                importedCount += 1
            }
        }

        return ImportSummary(
            totalRowsSeen = totalRowsSeen,
            canonicalRowsSeen = canonicalRowsSeen,
            importedCount = importedCount,
            duplicateCount = duplicateCount,
            skippedVariantCount = skippedVariantCount,
        )
    }
}
