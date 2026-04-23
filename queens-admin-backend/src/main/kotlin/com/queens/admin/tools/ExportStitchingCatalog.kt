package com.queens.admin.tools

import com.queens.admin.QueensAdminApplication
import com.queens.admin.application.StitchingJsonExportService
import java.nio.file.Path
import kotlin.system.exitProcess
import org.springframework.boot.WebApplicationType
import org.springframework.boot.builder.SpringApplicationBuilder

fun main(args: Array<String>) {
    val options = parseStitchingExportArgs(args.toList())
    val context =
        SpringApplicationBuilder(QueensAdminApplication::class.java)
            .web(WebApplicationType.NONE)
            .run()

    try {
        val exporter = context.getBean(StitchingJsonExportService::class.java)
        val summary = exporter.exportCatalogs(options.directory)
        println("Stitching catalog export completed.")
        println("  Output directory: ${summary.outputDirectory}")
        println("  Index file: ${summary.indexPath}")
        println("  Fingerprint buckets: ${summary.fingerprintBucketCount}")
        println("  Starting puzzles: ${summary.startingPuzzleCount}")
        println("  Puzzles exported: ${summary.puzzleCount}")
        exitProcess(0)
    } catch (error: Throwable) {
        System.err.println("Stitching catalog export failed: ${error.message}")
        error.printStackTrace()
        exitProcess(1)
    } finally {
        context.close()
    }
}

private data class StitchingExportOptions(
    val directory: Path = defaultStitchingExportDirectory(),
)

private fun parseStitchingExportArgs(args: List<String>): StitchingExportOptions {
    var directory = defaultStitchingExportDirectory()
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
    return StitchingExportOptions(directory = directory)
}

private fun defaultStitchingExportDirectory(): Path {
    val candidates =
        listOf(
            Path.of("frontend/public/queens"),
            Path.of("../frontend/public/queens"),
        )
    return candidates.firstOrNull { it.toFile().exists() } ?: candidates.first()
}
