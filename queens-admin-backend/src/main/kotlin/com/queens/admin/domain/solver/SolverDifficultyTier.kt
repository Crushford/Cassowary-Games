package com.queens.admin.domain.solver

import com.queens.admin.domain.model.PuzzleDifficultyTier

enum class SolverDifficultyTier(val rank: Int) {
    PRECHECK(0),
    EASY(1),
    MEDIUM(2),
    HARD(3),
    EXTRA_HARD(4),
    UNSOLVABLE(5),
    ;

    fun includes(other: SolverDifficultyTier): Boolean = other.rank <= rank

    fun toPuzzleDifficultyTier(): PuzzleDifficultyTier =
        when (this) {
            PRECHECK, EASY -> PuzzleDifficultyTier.EASY
            MEDIUM -> PuzzleDifficultyTier.MEDIUM
            HARD -> PuzzleDifficultyTier.HARD
            EXTRA_HARD -> PuzzleDifficultyTier.EXTRA_HARD
            UNSOLVABLE -> PuzzleDifficultyTier.UNSOLVABLE
        }
}
