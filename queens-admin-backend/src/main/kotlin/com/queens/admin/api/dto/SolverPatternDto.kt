package com.queens.admin.api.dto

data class SolverPatternCellDto(
    val row: Int,
    val col: Int,
    val activeSquare: Boolean? = null,
)

data class SolverPatternOffsetDto(
    val row: Int,
    val col: Int,
)

data class SolverPatternDto(
    val id: String? = null,
    val size: Int,
    val cells: List<SolverPatternCellDto>,
    val outputFlags: List<SolverPatternOffsetDto>,
)

data class SolverPatternConfigDto(
    val id: String,
    val name: String,
    val size: Int,
    val cells: List<SolverPatternCellDto>,
    val outputFlags: List<SolverPatternOffsetDto>,
    val difficultyTier: String,
    val enabled: Boolean,
    val sortOrder: Int,
    val createdAt: String,
    val updatedAt: String,
)

data class BuiltInSolverStepDto(
    val id: String,
    val label: String,
    val description: String,
    val difficultyTier: String,
    val enabled: Boolean,
    val sortOrder: Int,
)

data class SolverConfigDto(
    val builtInSteps: List<BuiltInSolverStepDto>,
    val patterns: List<SolverPatternConfigDto>,
)

data class UpsertSolverPatternRequestDto(
    val id: String,
    val name: String,
    val size: Int,
    val cells: List<SolverPatternCellDto>,
    val outputFlags: List<SolverPatternOffsetDto>,
    val difficultyTier: String,
    val enabled: Boolean = true,
    val sortOrder: Int,
)
