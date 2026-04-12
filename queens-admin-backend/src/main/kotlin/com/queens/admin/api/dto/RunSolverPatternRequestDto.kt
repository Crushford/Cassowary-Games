package com.queens.admin.api.dto

data class RunSolverPatternRequestDto(
    val boardState: BoardStateDto,
    val pattern: SolverPatternDto,
)
