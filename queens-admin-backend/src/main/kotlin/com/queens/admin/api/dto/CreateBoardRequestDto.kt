package com.queens.admin.api.dto

data class CreateBoardRequestDto(
    val size: Int,
    val minimumGroupSize: Int = 3,
    val includeProgressUpdates: Boolean = false,
    val generationStrategy: String = "baseline",
)
