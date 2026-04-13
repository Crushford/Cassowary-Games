package com.queens.admin.tools

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.queens.admin.QueensAdminApplication
import com.queens.admin.infrastructure.persistence.PuzzleRepository
import com.queens.admin.infrastructure.persistence.SolverPatternRepository
import kotlin.system.exitProcess
import org.springframework.boot.WebApplicationType
import org.springframework.boot.builder.SpringApplicationBuilder

fun main() {
    val context =
        SpringApplicationBuilder(QueensAdminApplication::class.java)
            .web(WebApplicationType.NONE)
            .run()

    try {
        val puzzleRepository = context.getBean(PuzzleRepository::class.java)
        val solverPatternRepository = context.getBean(SolverPatternRepository::class.java)
        val objectMapper = context.getBean(ObjectMapper::class.java)

        val puzzleFingerprint = puzzleRepository.exportFingerprint()
        val patternFingerprint = solverPatternRepository.exportFingerprint()

        val payload = mapOf(
            "puzzles" to mapOf(
                "count" to puzzleFingerprint.count,
                "latestCreatedAt" to puzzleFingerprint.latestCreatedAt?.toString(),
                "latestDifficultyAssessedAt" to puzzleFingerprint.latestDifficultyAssessedAt?.toString(),
            ),
            "patterns" to mapOf(
                "count" to patternFingerprint.count,
                "latestUpdatedAt" to patternFingerprint.latestUpdatedAt?.toString(),
            ),
        )

        val output =
            objectMapper.copy()
                .enable(SerializationFeature.INDENT_OUTPUT)
                .writeValueAsString(payload)
        println(output)
        exitProcess(0)
    } catch (error: Throwable) {
        System.err.println("Export fingerprint generation failed: ${error.message}")
        error.printStackTrace()
        exitProcess(1)
    } finally {
        context.close()
    }
}
