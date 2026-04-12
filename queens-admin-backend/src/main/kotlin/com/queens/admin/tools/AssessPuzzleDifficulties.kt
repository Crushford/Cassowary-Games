package com.queens.admin.tools

import com.queens.admin.QueensAdminApplication
import com.queens.admin.application.PuzzleDifficultyBackfillService
import kotlin.system.exitProcess
import org.springframework.boot.WebApplicationType
import org.springframework.boot.builder.SpringApplicationBuilder

fun main(args: Array<String>) {
    val overwriteExisting =
        "--overwrite" in args ||
            System.getProperty("queens.assess.overwrite") == "true" ||
            System.getenv("QUEENS_ASSESS_OVERWRITE") == "true"
    val context =
        SpringApplicationBuilder(QueensAdminApplication::class.java)
            .web(WebApplicationType.NONE)
            .run()

    try {
        val backfillService = context.getBean(PuzzleDifficultyBackfillService::class.java)
        println(
            buildString {
                append("Starting puzzle difficulty assessment")
                if (overwriteExisting) {
                    append(" with overwrite enabled")
                } else {
                    append(" for puzzles missing a difficulty")
                }
                append(".")
            },
        )
        val summary = backfillService.assessAllPuzzles(
            options = PuzzleDifficultyBackfillService.BackfillOptions(overwriteExisting = overwriteExisting),
            progressListener = { progress ->
                println(
                    "[${progress.processedCount}/${progress.totalToProcess}] " +
                        "remaining=${progress.remainingCount} " +
                        "easy=${progress.easyCount} " +
                        "medium=${progress.mediumCount} " +
                        "hard=${progress.hardCount} " +
                        "extraHard=${progress.extraHardCount} " +
                        "unsolvable=${progress.unsolvableCount} " +
                        "-> ${progress.puzzle.id} size ${progress.puzzle.size} " +
                        "= ${progress.assessedTier.name.lowercase().replace('_', '-')}",
                )
            },
        )
        println("Puzzle difficulty assessment completed.")
        println("  Puzzles in DB: ${summary.totalPuzzlesInDatabase}")
        println("  Puzzles targeted this run: ${summary.totalToProcess}")
        println("  Assessed: ${summary.assessedCount}")
        println("  Skipped existing: ${summary.skippedExistingCount}")
        println("  Easy: ${summary.easyCount}")
        println("  Medium: ${summary.mediumCount}")
        println("  Hard: ${summary.hardCount}")
        println("  Extra Hard: ${summary.extraHardCount}")
        println("  Unsolvable: ${summary.unsolvableCount}")
        exitProcess(0)
    } catch (error: Throwable) {
        System.err.println("Puzzle difficulty assessment failed: ${error.message}")
        error.printStackTrace()
        exitProcess(1)
    } finally {
        context.close()
    }
}
