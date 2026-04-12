package com.queens.admin.api.dto

data class BatchGenerationRequestDto(
    val sizes: List<Int>,
    val orthogonalMinDistances: List<Int>? = null,
    val strategies: List<String>,
    val runsPerCombination: Int,
    val runMode: String = "cartesian",
    val queenCountMode: String = "exact",
    val targetQueenCount: Int? = null,
    val orthogonalMinDistance: Int? = null,
    val minimumGroupSize: Int = 3,
    val maxConcurrentJobs: Int = 2,
    val saveSuccessfulPuzzles: Boolean = false,
)
