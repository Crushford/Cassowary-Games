package com.queens.admin.domain.model

enum class PuzzleDifficultyTier(val score: Int) {
    EXTRA_EASY(1),
    EASY(2),
    MEDIUM(3),
    HARD(4),
    EXTRA_HARD(5),
    UNSOLVABLE(6),
}
