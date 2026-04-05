package com.queens.admin.api.dto

data class BatchGenerationRequestDto(
    val sizes: List<Int>,
    val strategies: List<String>,
    val runsPerCombination: Int,
    val queenCountMode: String = "exact",
    val targetQueenCount: Int? = null,
    val orthogonalMinDistance: Int? = null,
    val minimumGroupSize: Int = 3,
    val maxConcurrentJobs: Int = 2,
    val saveSuccessfulPuzzles: Boolean = false,
)
