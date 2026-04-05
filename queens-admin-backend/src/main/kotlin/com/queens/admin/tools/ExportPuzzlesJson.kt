package com.queens.admin.tools

import com.queens.admin.QueensAdminApplication
import com.queens.admin.application.PuzzleJsonExportService
import java.nio.file.Path
import kotlin.system.exitProcess
import org.springframework.boot.WebApplicationType
import org.springframework.boot.builder.SpringApplicationBuilder

fun main(args: Array<String>) {
    val options = parseExportArgs(args.toList())
    val context =
        SpringApplicationBuilder(QueensAdminApplication::class.java)
            .web(WebApplicationType.NONE)
            .run()

    try {
        val exporter = context.getBean(PuzzleJsonExportService::class.java)
        val summary = exporter.exportCatalogs(options.directory)

        println("Puzzle JSON export completed.")
        println("  Classic file: ${summary.classicOutputPath}")
        println("  Classic size buckets: ${summary.classicSizeBucketCount}")
        println("  Classic puzzles exported: ${summary.classicPuzzleCount}")
        println("  Extended file: ${summary.extendedOutputPath}")
        println("  Extended size buckets: ${summary.extendedSizeBucketCount}")
        println("  Extended puzzles exported: ${summary.extendedPuzzleCount}")
        exitProcess(0)
    } catch (error: Throwable) {
        System.err.println("Puzzle JSON export failed: ${error.message}")
        error.printStackTrace()
        exitProcess(1)
    } finally {
        context.close()
    }
}

private data class ExportOptions(
    val directory: Path = defaultExportPuzzleDirectory(),
)

private fun parseExportArgs(args: List<String>): ExportOptions {
    var directory = defaultExportPuzzleDirectory()

    var index = 0
    while (index < args.size) {
        when (args[index]) {
            "--dir" -> {
                directory = Path.of(args.getOrNull(index + 1) ?: error("Missing value for --dir"))
                index += 1
            }
        }
        index += 1
    }

    return ExportOptions(directory = directory)
}

private fun defaultExportPuzzleDirectory(): Path {
    val candidates =
        listOf(
            Path.of("frontend/public/queens"),
            Path.of("../frontend/public/queens"),
        )

    return candidates.firstOrNull { it.toFile().exists() } ?: candidates.first()
}
