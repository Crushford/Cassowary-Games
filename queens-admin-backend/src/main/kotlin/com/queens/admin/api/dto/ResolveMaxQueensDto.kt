package com.queens.admin.api.dto

data class ResolveMaxQueensRequestDto(
    val size: Int,
    val orthogonalMinDistance: Int? = null,
)

data class ResolveMaxQueensResultDto(
    val size: Int,
    val orthogonalMinDistance: Int,
    val maxQueenCount: Int,
    val elapsedMs: Long,
)
