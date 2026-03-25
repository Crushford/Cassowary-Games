package com.queens.admin.api

import com.queens.admin.api.dto.BoardStateRequestDto
import com.queens.admin.api.dto.CreateBoardRequestDto
import com.queens.admin.api.dto.ExpandGroupRequestDto
import com.queens.admin.api.dto.OperationResultDto
import com.queens.admin.application.GenerationWorkflowService
import com.queens.admin.infrastructure.mapper.BoardStateMapper
import com.queens.admin.infrastructure.mapper.OperationResultMapper
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/queens/admin/generation")
class GenerationController(
    private val generationWorkflowService: GenerationWorkflowService,
    private val boardStateMapper: BoardStateMapper,
    private val operationResultMapper: OperationResultMapper,
) {
    @PostMapping("/generate-valid-board")
    fun generateValidBoard(@RequestBody request: CreateBoardRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            generationWorkflowService.generateValidBoard(request.size),
        )
    }

    @PostMapping("/place-queens")
    fun placeQueens(@RequestBody request: BoardStateRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            generationWorkflowService.placeQueens(boardStateMapper.toDomain(request.boardState)),
        )
    }

    @PostMapping("/assign-initial-colors")
    fun assignInitialColors(@RequestBody request: BoardStateRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            generationWorkflowService.assignInitialColors(boardStateMapper.toDomain(request.boardState)),
        )
    }

    @PostMapping("/expand-all-groups-once")
    fun expandAllGroupsOnce(@RequestBody request: BoardStateRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            generationWorkflowService.expandAllGroupsOnce(boardStateMapper.toDomain(request.boardState)),
        )
    }

    @PostMapping("/expand-selected-group")
    fun expandSelectedGroup(@RequestBody request: ExpandGroupRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            generationWorkflowService.expandSelectedGroup(
                boardState = boardStateMapper.toDomain(request.boardState),
                targetColor = request.targetColor ?: request.targetGroupId,
            ),
        )
    }

    @PostMapping("/expand-blocked-squares")
    fun expandBlockedSquares(@RequestBody request: BoardStateRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            generationWorkflowService.expandBlockedSquares(boardStateMapper.toDomain(request.boardState)),
        )
    }
}
