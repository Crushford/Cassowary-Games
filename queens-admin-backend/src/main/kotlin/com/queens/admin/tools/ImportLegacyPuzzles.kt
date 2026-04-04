package com.queens.admin.tools

import com.queens.admin.QueensAdminApplication
import com.queens.admin.application.LegacyPuzzleImportService
import java.nio.file.Path
import kotlin.system.exitProcess
import org.springframework.boot.WebApplicationType
import org.springframework.boot.builder.SpringApplicationBuilder

fun main(args: Array<String>) {
    val options = parseArgs(args.toList())
    val context = SpringApplicationBuilder(QueensAdminApplication::class.java)
        .web(WebApplicationType.NONE)
        .run()

    try {
        val importer = context.getBean(LegacyPuzzleImportService::class.java)
        val summary = importer.importFromJson(
            path = options.path,
            minimumGroupSize = options.minimumGroupSize,
            generationStrategy = options.generationStrategy,
        )

        println("Legacy puzzle import completed.")
        println("  File: ${options.path}")
        println("  Rows seen: ${summary.totalRowsSeen}")
        println("  Canonical -0 rows considered: ${summary.canonicalRowsSeen}")
        println("  Variant rows skipped: ${summary.skippedVariantCount}")
        println("  Imported: ${summary.importedCount}")
        println("  Already in DB: ${summary.duplicateCount}")
        exitProcess(0)
    } catch (error: Throwable) {
        System.err.println("Legacy puzzle import failed: ${error.message}")
        error.printStackTrace()
        exitProcess(1)
    } finally {
        context.close()
    }
}

private data class ImportOptions(
    val path: Path = defaultLegacyPuzzlePath(),
    val minimumGroupSize: Int = 3,
    val generationStrategy: String = "legacy-import",
)

private fun parseArgs(args: List<String>): ImportOptions {
    var path = defaultLegacyPuzzlePath()
    var minimumGroupSize = 3
    var generationStrategy = "legacy-import"

    var index = 0
    while (index < args.size) {
        when (args[index]) {
            "--file" -> {
                path = Path.of(args.getOrNull(index + 1) ?: error("Missing value for --file"))
                index += 1
            }
            "--minimum-group-size" -> {
                minimumGroupSize =
                    args.getOrNull(index + 1)?.toIntOrNull() ?: error("Missing value for --minimum-group-size")
                index += 1
            }
            "--generation-strategy" -> {
                generationStrategy = args.getOrNull(index + 1) ?: error("Missing value for --generation-strategy")
                index += 1
            }
        }
        index += 1
    }

    return ImportOptions(
        path = path,
        minimumGroupSize = minimumGroupSize,
        generationStrategy = generationStrategy,
    )
}

private fun defaultLegacyPuzzlePath(): Path {
    val candidates = listOf(
        Path.of("frontend/public/queens/puzzles.json"),
        Path.of("../frontend/public/queens/puzzles.json"),
    )

    return candidates.firstOrNull { it.toFile().exists() } ?: candidates.first()
}
