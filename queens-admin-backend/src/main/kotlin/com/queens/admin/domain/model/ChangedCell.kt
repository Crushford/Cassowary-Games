package com.queens.admin.domain.model

data class ChangedCell(
    val row: Int,
    val col: Int,
    val changeType: String,
    val explanation: String? = null,
)
