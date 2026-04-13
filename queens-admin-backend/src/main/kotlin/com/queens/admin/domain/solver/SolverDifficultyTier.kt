package com.queens.admin.domain.solver

import com.queens.admin.domain.model.PuzzleDifficultyTier

enum class SolverDifficultyTier(val rank: Int) {
    PRECHECK(0),
    TUTORIAL(1),
    EXTRA_EASY(2),
    EASY(3),
    MEDIUM(4),
    HARD(5),
    EXTRA_HARD(6),
    UNSOLVABLE(7),
    ;

    fun includes(other: SolverDifficultyTier): Boolean = other.rank <= rank

    fun toPuzzleDifficultyTier(): PuzzleDifficultyTier =
        when (this) {
            PRECHECK -> PuzzleDifficultyTier.TUTORIAL
            TUTORIAL -> PuzzleDifficultyTier.TUTORIAL
            EXTRA_EASY -> PuzzleDifficultyTier.EXTRA_EASY
            EASY -> PuzzleDifficultyTier.EASY
            MEDIUM -> PuzzleDifficultyTier.MEDIUM
            HARD -> PuzzleDifficultyTier.HARD
            EXTRA_HARD -> PuzzleDifficultyTier.EXTRA_HARD
            UNSOLVABLE -> PuzzleDifficultyTier.UNSOLVABLE
        }
}
