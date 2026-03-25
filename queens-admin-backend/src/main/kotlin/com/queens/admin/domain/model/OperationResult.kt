package com.queens.admin.domain.model

data class OperationResult(
    val success: Boolean,
    val actionType: ActionType,
    val explanation: String,
    val boardState: BoardState?,
    val changedCells: List<ChangedCell> = emptyList(),
    val warnings: List<String> = emptyList(),
    val errors: List<String> = emptyList(),
    val validation: ValidationSummary? = null,
)
