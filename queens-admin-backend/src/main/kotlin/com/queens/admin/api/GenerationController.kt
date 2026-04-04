package com.queens.admin.api

import com.queens.admin.api.dto.BoardStateRequestDto
import com.queens.admin.api.dto.CreateBoardRequestDto
import com.queens.admin.api.dto.ExpandGroupRequestDto
import com.queens.admin.api.dto.GenerationJobStartedDto
import com.queens.admin.api.dto.GenerationJobStatusDto
import com.queens.admin.api.dto.OperationResultDto
import com.queens.admin.application.GenerationJobService
import com.queens.admin.application.GenerationWorkflowService
import com.queens.admin.infrastructure.mapper.BoardStateMapper
import com.queens.admin.infrastructure.mapper.GenerationJobMapper
import com.queens.admin.infrastructure.mapper.OperationResultMapper
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/queens/admin/generation")
class GenerationController(
    private val generationWorkflowService: GenerationWorkflowService,
    private val generationJobService: GenerationJobService,
    private val boardStateMapper: BoardStateMapper,
    private val generationJobMapper: GenerationJobMapper,
    private val operationResultMapper: OperationResultMapper,
) {
    @PostMapping("/generate-valid-board/jobs")
    fun startGenerateValidBoardJob(@RequestBody request: CreateBoardRequestDto): GenerationJobStartedDto {
        return generationJobMapper.toStartedDto(
            generationJobService.startGenerationJob(
                size = request.size,
                includeProgressUpdates = request.includeProgressUpdates,
            ),
        )
    }

    @GetMapping("/jobs/{jobId}")
    fun getGenerationJob(@PathVariable jobId: String): ResponseEntity<GenerationJobStatusDto> {
        val snapshot = generationJobService.getJobSnapshot(jobId)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(generationJobMapper.toStatusDto(snapshot))
    }

    @PostMapping("/jobs/{jobId}/cancel")
    fun cancelGenerationJob(@PathVariable jobId: String): ResponseEntity<GenerationJobStatusDto> {
        val snapshot = generationJobService.cancelJob(jobId)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(generationJobMapper.toStatusDto(snapshot))
    }

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
