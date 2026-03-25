package com.queens.admin.api.dto

data class ChangedCellDto(
    val row: Int,
    val col: Int,
    val changeType: String,
    val explanation: String? = null,
)

data class ValidationSummaryDto(
    val isValid: Boolean,
    val warnings: List<String>,
    val errors: List<String>,
    val queenCount: Int,
    val markedFlagCount: Int,
    val coloredCellCount: Int,
    val distinctColorCount: Int,
)

data class OperationResultDto(
    val success: Boolean,
    val actionType: String,
    val explanation: String,
    val boardState: BoardStateDto?,
    val changedCells: List<ChangedCellDto>,
    val warnings: List<String>,
    val errors: List<String>,
    val validation: ValidationSummaryDto? = null,
)
