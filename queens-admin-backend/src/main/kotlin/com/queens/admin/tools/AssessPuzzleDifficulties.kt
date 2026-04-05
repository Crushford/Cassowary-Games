package com.queens.admin.tools

import com.queens.admin.QueensAdminApplication
import com.queens.admin.application.PuzzleDifficultyBackfillService
import kotlin.system.exitProcess
import org.springframework.boot.WebApplicationType
import org.springframework.boot.builder.SpringApplicationBuilder

fun main() {
    val context =
        SpringApplicationBuilder(QueensAdminApplication::class.java)
            .web(WebApplicationType.NONE)
            .run()

    try {
        val backfillService = context.getBean(PuzzleDifficultyBackfillService::class.java)
        val summary = backfillService.assessAllPuzzles()
        println("Puzzle difficulty assessment completed.")
        println("  Puzzles seen: ${summary.totalPuzzles}")
        println("  Assessed: ${summary.assessedCount}")
        println("  Easy: ${summary.easyCount}")
        println("  Medium: ${summary.mediumCount}")
        println("  Hard: ${summary.hardCount}")
        exitProcess(0)
    } catch (error: Throwable) {
        System.err.println("Puzzle difficulty assessment failed: ${error.message}")
        error.printStackTrace()
        exitProcess(1)
    } finally {
        context.close()
    }
}
