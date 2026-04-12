package com.queens.admin.domain.model

enum class PuzzleDifficultyTier(val score: Int) {
    EASY(1),
    MEDIUM(2),
    HARD(3),
    EXTRA_HARD(4),
    UNSOLVABLE(5),
}
