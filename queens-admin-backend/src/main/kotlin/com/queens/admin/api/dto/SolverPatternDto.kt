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
