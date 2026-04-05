package com.queens.admin.domain.service

import com.queens.admin.domain.model.Position
import com.queens.admin.domain.model.QueensRuleset
import kotlin.math.abs
import org.springframework.stereotype.Service

@Service
class QueensConstraintService {
    fun isConflict(
        left: Position,
        right: Position,
        ruleset: QueensRuleset,
    ): Boolean {
        if (left == right) return false

        if (left.row == right.row &&
            abs(left.col - right.col) < ruleset.orthogonalMinDistance
        ) {
            return true
        }

        if (left.col == right.col &&
            abs(left.row - right.row) < ruleset.orthogonalMinDistance
        ) {
            return true
        }

        return ruleset.forbidDiagonalTouch &&
            abs(left.row - right.row) == 1 &&
            abs(left.col - right.col) == 1
    }

    fun getExcludedSquares(
        boardSize: Int,
        queenPosition: Position,
        ruleset: QueensRuleset,
    ): Set<Position> {
        val excluded = linkedSetOf<Position>()
        val maxOrthogonalOffset = ruleset.orthogonalMinDistance - 1

        if (maxOrthogonalOffset >= 1) {
            for (offset in 1..maxOrthogonalOffset) {
                listOf(
                    Position(queenPosition.row, queenPosition.col - offset),
                    Position(queenPosition.row, queenPosition.col + offset),
                    Position(queenPosition.row - offset, queenPosition.col),
                    Position(queenPosition.row + offset, queenPosition.col),
                ).filter { position ->
                    position.row in 0 until boardSize && position.col in 0 until boardSize
                }.forEach(excluded::add)
            }
        }

        if (ruleset.forbidDiagonalTouch) {
            listOf(
                Position(queenPosition.row - 1, queenPosition.col - 1),
                Position(queenPosition.row - 1, queenPosition.col + 1),
                Position(queenPosition.row + 1, queenPosition.col - 1),
                Position(queenPosition.row + 1, queenPosition.col + 1),
            ).filter { position ->
                position.row in 0 until boardSize && position.col in 0 until boardSize
            }.forEach(excluded::add)
        }

        return excluded
    }

    fun isValidPlacement(
        position: Position,
        placedQueens: Collection<Position>,
        ruleset: QueensRuleset,
    ): Boolean = placedQueens.none { existing -> isConflict(existing, position, ruleset) }
}
