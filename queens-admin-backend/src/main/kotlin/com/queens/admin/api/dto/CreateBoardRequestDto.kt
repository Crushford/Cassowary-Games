package com.queens.admin.api.dto

data class CreateBoardRequestDto(
    val size: Int,
    val queenCountMode: String? = null,
    val targetQueenCount: Int? = null,
    val orthogonalMinDistance: Int? = null,
    val minimumGroupSize: Int = 3,
    val blackoutFingerprintKey: String? = null,
    val includeProgressUpdates: Boolean = false,
    val generationStrategy: String = "baseline",
    val seedTemplateOffsets: List<TemplateOffsetDto>? = null,
)
