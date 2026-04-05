package com.queens.admin.domain.solver.rules

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.solver.SolverDifficultyTier
import com.queens.admin.domain.solver.SolverRule
import com.queens.admin.domain.solver.SolverStep
import com.queens.admin.domain.service.DeterministicSolverSupportService
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

@Component
@Order(10)
class PlaceLastFreeQueensRule(
    private val solverSupportService: DeterministicSolverSupportService,
) : SolverRule {
    override val ruleName: String = "forced-group-queen"
    override val difficultyTier: SolverDifficultyTier = SolverDifficultyTier.EASY

    override fun apply(boardState: BoardState): SolverStep? {
        for ((color, positions) in solverSupportService.groupedPositions(boardState)) {
            val queensInGroup = positions.count { position ->
                boardState.cells[position.row][position.col].markType ==
                    com.queens.admin.domain.model.MarkType.QUEEN
            }
            if (queensInGroup >= 1) continue
            val candidates = solverSupportService.candidatePositions(boardState, positions)
            if (candidates.size == 1) {
                val target = candidates.single()
                val (updatedBoard, changedCells) = solverSupportService.placeQueen(
                    boardState = boardState,
                    row = target.row,
                    col = target.col,
                    explanation = "only remaining candidate in color group $color",
                )
                return SolverStep(
                    ruleName = ruleName,
                    difficultyTier = difficultyTier,
                    explanation = "Placed a queen because color group $color had exactly one remaining candidate.",
                    boardState = updatedBoard,
                    changedCells = changedCells,
                )
            }
        }

        return null
    }
}
