package com.queens.admin.api.dto

data class CreateBoardRequestDto(
    val size: Int,
    val includeProgressUpdates: Boolean = false,
)
