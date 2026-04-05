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
        val summary = exporter.exportToJson(options.path)

        println("Puzzle JSON export completed.")
        println("  File: ${summary.outputPath}")
        println("  Size buckets: ${summary.sizeBucketCount}")
        println("  Puzzles exported: ${summary.puzzleCount}")
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
    val path: Path = defaultExportPuzzlePath(),
)

private fun parseExportArgs(args: List<String>): ExportOptions {
    var path = defaultExportPuzzlePath()

    var index = 0
    while (index < args.size) {
        when (args[index]) {
            "--file" -> {
                path = Path.of(args.getOrNull(index + 1) ?: error("Missing value for --file"))
                index += 1
            }
        }
        index += 1
    }

    return ExportOptions(path = path)
}

private fun defaultExportPuzzlePath(): Path {
    val candidates =
        listOf(
            Path.of("frontend/public/queens/puzzles.json"),
            Path.of("../frontend/public/queens/puzzles.json"),
        )

    return candidates.firstOrNull { it.parent?.toFile()?.exists() == true } ?: candidates.first()
}
