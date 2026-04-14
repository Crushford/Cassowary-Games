package com.queens.admin.application

import com.fasterxml.jackson.databind.ObjectMapper
import java.nio.file.Files
import java.nio.file.Path
import java.util.Comparator
import kotlin.io.path.deleteIfExists
import org.springframework.stereotype.Service

@Service
class PuzzleJsonExportService(
    private val objectMapper: ObjectMapper,
    private val puzzleCatalogService: PuzzleCatalogService,
) {
    companion object {
        const val CLASSIC_EXPORT_FILE = "puzzles.json"
        const val EXTENDED_EXPORT_FILE = "extendedPuzzles.json"
        const val SPLIT_EXPORT_DIRECTORY = "catalog"
        const val STORY_INDEX_FILE = "story-index.json"
    }

    data class SplitCatalogIndexEntry(
        val sizeKey: String,
        val difficulty: String,
        val orthogonalMinDistances: List<Int>,
        val countsByOrthogonalMinDistance: Map<Int, Int>,
        val count: Int,
        val path: String,
    )

    data class StoryIndexEntry(
        val levelIndex: Int,
        val sizeKey: String,
        val difficulty: String,
        val orthogonalMinDistance: Int,
        val targetTimeSeconds: Int,
    )

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
        val splitRoot = directory.resolve(SPLIT_EXPORT_DIRECTORY)

        val classicGrouped = groupForExport(classicPuzzles)
        val extendedGrouped = groupForExport(extendedPuzzles)

        writeGrouped(classicPath, classicGrouped)
        writeGrouped(extendedPath, extendedGrouped)
        val classicIndex = writeSplitCatalogs(splitRoot, "classic", classicPuzzles)
        val extendedIndex = writeSplitCatalogs(splitRoot, "extended", extendedPuzzles)
        writeStoryIndex(splitRoot, classicIndex + extendedIndex)

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

    private fun writeSplitCatalogs(
        splitRoot: Path,
        namespace: String,
        puzzles: List<com.queens.admin.domain.model.PersistedPuzzle>,
    ): List<SplitCatalogIndexEntry> {
        val namespaceRoot = splitRoot.resolve(namespace)
        if (Files.exists(namespaceRoot)) {
            Files.walk(namespaceRoot)
                .sorted(Comparator.reverseOrder())
                .forEach { path ->
                    if (path != namespaceRoot) {
                        path.deleteIfExists()
                    }
                }
            namespaceRoot.deleteIfExists()
        }

        val grouped =
            puzzles.groupBy { puzzle ->
                val sizeKey = "${puzzle.size}x${puzzle.size}"
                val difficulty = puzzle.difficultyTier?.name?.lowercase()?.replace('_', '-') ?: "unknown"
                sizeKey to difficulty
            }

        val indexEntries =
            grouped.entries
                .sortedWith(compareBy<Map.Entry<Pair<String, String>, List<com.queens.admin.domain.model.PersistedPuzzle>>>(
                    { it.key.first.substringBefore('x').toInt() },
                    { it.key.second },
                ))
                .map { (key, bucketPuzzles) ->
                    val (sizeKey, difficulty) = key
                    val outputPath = namespaceRoot.resolve(sizeKey).resolve("$difficulty.json")
                    Files.createDirectories(outputPath.parent)
                    val countsByOrthogonalMinDistance =
                        bucketPuzzles
                            .groupingBy { it.orthogonalMinDistance }
                            .eachCount()
                            .toSortedMap()
                    Files.newBufferedWriter(outputPath).use { writer ->
                        objectMapper.writerWithDefaultPrettyPrinter().writeValue(
                            writer,
                            linkedMapOf(sizeKey to groupForExport(bucketPuzzles)[sizeKey].orEmpty()),
                        )
                    }

                    SplitCatalogIndexEntry(
                        sizeKey = sizeKey,
                        difficulty = difficulty,
                        orthogonalMinDistances =
                            bucketPuzzles.map { it.orthogonalMinDistance }.distinct().sorted(),
                        countsByOrthogonalMinDistance = countsByOrthogonalMinDistance,
                        count = bucketPuzzles.size,
                        path = "/queens/$SPLIT_EXPORT_DIRECTORY/$namespace/$sizeKey/$difficulty.json",
                    )
                }

        val indexPath = splitRoot.resolve("$namespace-index.json")
        Files.createDirectories(indexPath.parent)
        Files.newBufferedWriter(indexPath).use { writer ->
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(writer, indexEntries)
        }

        return indexEntries
    }

    private fun writeStoryIndex(
        splitRoot: Path,
        indexEntries: List<SplitCatalogIndexEntry>,
    ) {
        val difficultyOrder =
            listOf("tutorial", "extra-easy", "easy", "medium", "hard", "extra-hard")
        val grouped = indexEntries.groupBy { it.sizeKey to it.difficulty }
        val sizeKeys =
            grouped.keys
                .map { it.first }
                .distinct()
                .sortedBy { it.substringBefore('x').toIntOrNull() ?: Int.MAX_VALUE }

        val storyEntries = mutableListOf<StoryIndexEntry>()
        var levelIndex = 0

        for (difficulty in difficultyOrder) {
            for (sizeKey in sizeKeys) {
                val entries = grouped[sizeKey to difficulty].orEmpty()
                if (entries.isEmpty()) continue

                val boardSize = sizeKey.substringBefore('x').toIntOrNull() ?: continue
                val orthogonalDistances =
                    entries.flatMap { it.orthogonalMinDistances }.distinct().sorted()
                val preferredDistance =
                    orthogonalDistances.firstOrNull { it == boardSize } ?: orthogonalDistances.firstOrNull() ?: continue

                levelIndex += 1
                storyEntries +=
                    StoryIndexEntry(
                        levelIndex = levelIndex,
                        sizeKey = sizeKey,
                        difficulty = difficulty,
                        orthogonalMinDistance = preferredDistance,
                        targetTimeSeconds = calculateStoryTargetTime(boardSize, difficulty),
                    )
            }
        }

        val storyIndexPath = splitRoot.resolve(STORY_INDEX_FILE)
        Files.createDirectories(storyIndexPath.parent)
        Files.newBufferedWriter(storyIndexPath).use { writer ->
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(writer, storyEntries)
        }
    }

    private fun calculateStoryTargetTime(boardSize: Int, difficulty: String): Int {
        val baseSeconds =
            mapOf(
                4 to 30,
                5 to 45,
                6 to 60,
                7 to 90,
                8 to 120,
                9 to 180,
                10 to 240,
                11 to 300,
            )[boardSize] ?: maxOf(30, boardSize * 30)

        val multiplier =
            when (difficulty) {
                "tutorial" -> 1.0
                "extra-easy" -> 1.15
                "easy" -> 1.35
                "medium" -> 1.6
                "hard" -> 2.0
                "extra-hard" -> 2.5
                else -> 1.35
            }

        return kotlin.math.round(baseSeconds * multiplier).toInt()
    }

    private fun isClassicPuzzle(puzzle: com.queens.admin.domain.model.PersistedPuzzle): Boolean =
        puzzle.targetQueenCount == puzzle.size && puzzle.orthogonalMinDistance == puzzle.size
}
