package com.queens.admin.domain.model

enum class GenerationPhase {
    EMPTY,
    QUEENS_PLACED,
    INITIAL_COLORS_ASSIGNED,
    GROUPS_EXPANDED,
    BLOCKED_SQUARES_EXPANDED,
    SOLVED,
    ANALYZED,
}
