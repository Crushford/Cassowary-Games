package com.queens.admin.tools

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.queens.admin.QueensAdminApplication
import com.queens.admin.application.SolverConfigService
import com.queens.admin.application.SolverPatternCatalogService
import com.queens.admin.application.SharedQueensSolverConfigService
import java.nio.file.Files
import kotlin.system.exitProcess
import org.springframework.boot.WebApplicationType
import org.springframework.boot.builder.SpringApplicationBuilder

fun main() {
    val context =
        SpringApplicationBuilder(QueensAdminApplication::class.java)
            .web(WebApplicationType.NONE)
            .run()

    try {
        val solverConfigService = context.getBean(SolverConfigService::class.java)
        val solverPatternCatalogService = context.getBean(SolverPatternCatalogService::class.java)
        val sharedQueensSolverConfigService = context.getBean(SharedQueensSolverConfigService::class.java)
        val objectMapper = context.getBean(ObjectMapper::class.java)

        val outputPath = sharedQueensSolverConfigService.locateConfigPath()
        val payload = mapOf(
            "difficultyOrder" to listOf("tutorial", "extra-easy", "easy", "medium", "hard", "extra-hard", "unsolvable"),
            "builtInSteps" to solverConfigService.builtInSolverSteps().map { step ->
                mapOf(
                    "id" to step.id,
                    "label" to step.label,
                    "description" to step.description,
                    "difficultyTier" to step.difficultyTier.name.lowercase().replace('_', '-'),
                    "enabled" to step.enabled,
                    "sortOrder" to step.sortOrder,
                )
            },
            "patterns" to solverPatternCatalogService.findAll().map { pattern ->
                mapOf(
                    "id" to pattern.id,
                    "name" to pattern.name,
                    "size" to pattern.size,
                    "cells" to pattern.cells.map { cell ->
                        mapOf(
                            "row" to cell.row,
                            "col" to cell.col,
                            "activeSquare" to cell.activeSquare,
                        )
                    },
                    "outputFlags" to pattern.outputFlags.map { offset ->
                        mapOf(
                            "row" to offset.row,
                            "col" to offset.col,
                        )
                    },
                    "difficultyTier" to pattern.difficultyTier.name.lowercase().replace('_', '-'),
                    "enabled" to pattern.enabled,
                    "sortOrder" to pattern.sortOrder,
                )
            },
        )

        Files.createDirectories(outputPath.parent)
        Files.newBufferedWriter(outputPath).use { writer ->
            objectMapper.copy()
                .enable(SerializationFeature.INDENT_OUTPUT)
                .writeValue(writer, payload)
        }

        println("Exported shared solver config to $outputPath")
        exitProcess(0)
    } catch (error: Throwable) {
        System.err.println("Shared solver config export failed: ${error.message}")
        error.printStackTrace()
        exitProcess(1)
    } finally {
        context.close()
    }
}
