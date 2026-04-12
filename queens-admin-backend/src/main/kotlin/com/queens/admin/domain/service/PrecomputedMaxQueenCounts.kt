package com.queens.admin.domain.service

object PrecomputedMaxQueenCounts {
    val values: Map<Int, Map<Int, Int>> =
        mapOf(
            4 to mapOf(3 to 4, 4 to 4),
            5 to mapOf(3 to 6, 4 to 5, 5 to 5),
            6 to mapOf(3 to 8, 4 to 8, 5 to 8, 6 to 6),
            7 to mapOf(3 to 10, 4 to 10, 5 to 10, 6 to 9, 7 to 7),
            8 to mapOf(3 to 13, 4 to 13, 5 to 13, 6 to 11, 7 to 10, 8 to 8),
            9 to mapOf(7 to 12, 8 to 11, 9 to 9),
        )

    fun get(size: Int, orthogonalMinDistance: Int): Int? = values[size]?.get(orthogonalMinDistance)

    fun has(size: Int, orthogonalMinDistance: Int): Boolean =
        supportedDistancesForSize(size).contains(orthogonalMinDistance)

    fun rawDistancesForSize(size: Int): List<Int> = values[size]?.keys?.sorted().orEmpty()

    fun supportedDistancesForSize(size: Int): List<Int> {
        val distanceMap = values[size] ?: return emptyList()
        val sortedEntries = distanceMap.entries.sortedBy { it.key }
        val effectiveDistances = mutableListOf<Int>()
        var previousMaxQueens: Int? = null
        for (entry in sortedEntries.asReversed()) {
            if (entry.value != previousMaxQueens) {
                effectiveDistances += entry.key
                previousMaxQueens = entry.value
            }
        }
        return effectiveDistances.sorted()
    }
}
