package com.queens.admin.domain.solver

import com.queens.admin.domain.model.PuzzleDifficultyTier

enum class SolverDifficultyTier(val rank: Int) {
    PRECHECK(0),
    EXTRA_EASY(1),
    EASY(2),
    MEDIUM(3),
    HARD(4),
    EXTRA_HARD(5),
    UNSOLVABLE(6),
    ;

    fun includes(other: SolverDifficultyTier): Boolean = other.rank <= rank

    fun toPuzzleDifficultyTier(): PuzzleDifficultyTier =
        when (this) {
            PRECHECK, EXTRA_EASY -> PuzzleDifficultyTier.EXTRA_EASY
            EASY -> PuzzleDifficultyTier.EASY
            MEDIUM -> PuzzleDifficultyTier.MEDIUM
            HARD -> PuzzleDifficultyTier.HARD
            EXTRA_HARD -> PuzzleDifficultyTier.EXTRA_HARD
            UNSOLVABLE -> PuzzleDifficultyTier.UNSOLVABLE
        }
}
