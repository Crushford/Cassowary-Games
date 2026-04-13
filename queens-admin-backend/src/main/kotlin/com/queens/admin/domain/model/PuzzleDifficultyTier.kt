package com.queens.admin.domain.model

enum class PuzzleDifficultyTier(val score: Int) {
    TUTORIAL(1),
    EXTRA_EASY(2),
    EASY(3),
    MEDIUM(4),
    HARD(5),
    EXTRA_HARD(6),
    UNSOLVABLE(7),
}
