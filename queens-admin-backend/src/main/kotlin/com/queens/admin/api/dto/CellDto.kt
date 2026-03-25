package com.queens.admin.api.dto

data class CellDto(
    val row: Int,
    val col: Int,
    val groupColor: String? = null,
    val isSolutionQueen: Boolean = false,
    val markType: String = "NONE",
)
