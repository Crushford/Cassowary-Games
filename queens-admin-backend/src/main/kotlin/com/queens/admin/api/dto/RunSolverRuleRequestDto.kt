package com.queens.admin.api.dto

data class RunSolverRuleRequestDto(
    val boardState: BoardStateDto,
    val ruleName: String,
)
