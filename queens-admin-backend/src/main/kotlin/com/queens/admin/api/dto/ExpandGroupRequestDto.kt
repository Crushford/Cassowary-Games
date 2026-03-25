package com.queens.admin.api.dto

data class ExpandGroupRequestDto(
    val boardState: BoardStateDto,
    val targetGroupId: String? = null,
    val targetColor: String? = null,
    val targetRow: Int? = null,
    val targetCol: Int? = null,
)
