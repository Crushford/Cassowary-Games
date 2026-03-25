package com.queens.admin.domain.service

import com.queens.admin.domain.model.ActionType
import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.OperationResult
import org.springframework.stereotype.Service

@Service
class BlockedSquareExpansionService(
    private val boardValidationService: BoardValidationService,
) {
    fun expandBlockedSquares(boardState: BoardState): OperationResult {
        return OperationResult(
            success = false,
            actionType = ActionType.EXPAND_BLOCKED_SQUARES,
            explanation = "Blocked-square expansion is scaffolded but not implemented yet.",
            boardState = boardState,
            warnings = listOf("Use this hook for the later blocked-square generation phase."),
            validation = boardValidationService.validate(boardState),
        )
    }
}
