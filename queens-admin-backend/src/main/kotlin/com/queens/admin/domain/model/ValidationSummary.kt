package com.queens.admin.domain.model

data class ValidationSummary(
    val isValid: Boolean,
    val warnings: List<String>,
    val errors: List<String>,
    val queenCount: Int,
    val markedFlagCount: Int,
    val coloredCellCount: Int,
    val distinctColorCount: Int,
)
