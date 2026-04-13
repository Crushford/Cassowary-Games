package com.queens.admin.application

import com.fasterxml.jackson.databind.ObjectMapper
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import org.springframework.stereotype.Service

@Service
class SharedQueensSolverConfigService(
    private val objectMapper: ObjectMapper,
) {
    data class SharedSolverPatternCell(
        val row: Int,
        val col: Int,
        val activeSquare: Boolean = false,
    )

    data class SharedSolverPatternOffset(
        val row: Int,
        val col: Int,
    )

    data class SharedBuiltInSolverStep(
        val id: String,
        val label: String,
        val description: String,
        val difficultyTier: String,
        val enabled: Boolean,
        val sortOrder: Int,
    )

    data class SharedSolverPattern(
        val id: String,
        val name: String,
        val size: Int,
        val cells: List<SharedSolverPatternCell>,
        val outputFlags: List<SharedSolverPatternOffset>,
        val difficultyTier: String,
        val enabled: Boolean,
        val sortOrder: Int,
    )

    data class SharedSolverConfig(
        val difficultyOrder: List<String>,
        val builtInSteps: List<SharedBuiltInSolverStep>,
        val patterns: List<SharedSolverPattern>,
    )

    fun locateExportFingerprintPath(): Path {
        val userDir = Paths.get(System.getProperty("user.dir"))
        val candidates = listOf(
            userDir.resolve("../shared/queens-export-fingerprint.json").normalize(),
            userDir.resolve("shared/queens-export-fingerprint.json").normalize(),
        )

        return candidates.firstOrNull(Files::exists) ?: candidates.first()
    }

    fun load(): SharedSolverConfig {
        val path = locateConfigPath()
        return Files.newBufferedReader(path).use { reader ->
            objectMapper.readValue(reader, SharedSolverConfig::class.java)
        }
    }

    fun locateConfigPath(): Path {
        val userDir = Paths.get(System.getProperty("user.dir"))
        val candidates = listOf(
            userDir.resolve("../shared/queens-solver-config.json").normalize(),
            userDir.resolve("shared/queens-solver-config.json").normalize(),
        )

        return candidates.firstOrNull(Files::exists)
            ?: error("Shared Queens solver config not found. Checked: ${candidates.joinToString(", ")}")
    }
}
