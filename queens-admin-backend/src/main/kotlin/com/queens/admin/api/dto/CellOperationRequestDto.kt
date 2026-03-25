package com.queens.admin.api.dto

data class CellOperationRequestDto(
    val boardState: BoardStateDto,
    val row: Int,
    val col: Int,
    val color: String? = null,
    val markType: String? = null,
)
