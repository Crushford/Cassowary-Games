package com.queens.admin.api

import com.queens.admin.api.dto.BoardStateRequestDto
import com.queens.admin.api.dto.BatchGenerationRequestDto
import com.queens.admin.api.dto.BatchGenerationStartedDto
import com.queens.admin.api.dto.BatchGenerationStatusDto
import com.queens.admin.api.dto.CreateBoardRequestDto
import com.queens.admin.api.dto.ExpandGroupRequestDto
import com.queens.admin.api.dto.GenerationJobStartedDto
import com.queens.admin.api.dto.GenerationJobStatusDto
import com.queens.admin.api.dto.OperationResultDto
import com.queens.admin.api.dto.PuzzleCatalogStatsDto
import com.queens.admin.api.dto.SystemLoadDto
import com.queens.admin.application.BackendLoadService
import com.queens.admin.application.BatchGenerationService
import com.queens.admin.application.GenerationJobService
import com.queens.admin.application.GenerationWorkflowService
import com.queens.admin.application.PuzzleCatalogService
import com.queens.admin.domain.model.Position
import com.queens.admin.infrastructure.mapper.BatchGenerationMapper
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
    private val backendLoadService: BackendLoadService,
    private val batchGenerationService: BatchGenerationService,
    private val puzzleCatalogService: PuzzleCatalogService,
    private val boardStateMapper: BoardStateMapper,
    private val batchGenerationMapper: BatchGenerationMapper,
    private val generationJobMapper: GenerationJobMapper,
    private val operationResultMapper: OperationResultMapper,
) {
    @GetMapping("/catalog-stats")
    fun getCatalogStats(): PuzzleCatalogStatsDto {
        val countsBySize = puzzleCatalogService.countBySize()
        return PuzzleCatalogStatsDto(
            totalPuzzles = countsBySize.values.sum(),
            countsBySize = countsBySize
                .toSortedMap()
                .mapKeys { (size, _) -> "${size}x${size}" },
        )
    }

    @GetMapping("/system-load")
    fun getSystemLoad(): SystemLoadDto {
        val snapshot = backendLoadService.snapshot()
        return SystemLoadDto(
            processCpuPercent = snapshot.processCpuPercent,
            systemCpuPercent = snapshot.systemCpuPercent,
            systemLoadAverage = snapshot.systemLoadAverage,
            availableProcessors = snapshot.availableProcessors,
            heapUsedMb = snapshot.heapUsedMb,
            heapMaxMb = snapshot.heapMaxMb,
            singleJobsRunning = snapshot.singleJobsRunning,
            singleJobsQueued = snapshot.singleJobsQueued,
            batchRunsActive = snapshot.batchRunsActive,
            batchRunsQueued = snapshot.batchRunsQueued,
            runningBatchCount = snapshot.runningBatchCount,
            sampledAt = snapshot.sampledAt.toString(),
        )
    }

    @PostMapping("/batches")
    fun startBatchGeneration(@RequestBody request: BatchGenerationRequestDto): BatchGenerationStartedDto {
        return batchGenerationMapper.toStartedDto(
            batchGenerationService.startBatch(
                sizes = request.sizes,
                strategies = request.strategies,
                runsPerCombination = request.runsPerCombination,
                minimumGroupSize = request.minimumGroupSize,
                maxConcurrentJobs = request.maxConcurrentJobs,
                saveSuccessfulPuzzles = request.saveSuccessfulPuzzles,
            ),
        )
    }

    @GetMapping("/batches/{batchId}")
    fun getBatchGeneration(@PathVariable batchId: String): ResponseEntity<BatchGenerationStatusDto> {
        val snapshot = batchGenerationService.getBatchSnapshot(batchId)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(batchGenerationMapper.toStatusDto(snapshot))
    }

    @PostMapping("/batches/{batchId}/cancel")
    fun cancelBatchGeneration(@PathVariable batchId: String): ResponseEntity<BatchGenerationStatusDto> {
        val snapshot = batchGenerationService.cancelBatch(batchId)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(batchGenerationMapper.toStatusDto(snapshot))
    }

    @PostMapping("/generate-valid-board/jobs")
    fun startGenerateValidBoardJob(@RequestBody request: CreateBoardRequestDto): GenerationJobStartedDto {
        return generationJobMapper.toStartedDto(
            generationJobService.startGenerationJob(
                size = request.size,
                minimumGroupSize = request.minimumGroupSize,
                includeProgressUpdates = request.includeProgressUpdates,
                generationStrategy = request.generationStrategy,
                seedTemplateOffsets = request.seedTemplateOffsets?.map { Position(it.row, it.col) },
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
            generationWorkflowService.generateValidBoard(
                size = request.size,
                minimumGroupSize = request.minimumGroupSize,
                generationStrategy = request.generationStrategy,
                seedTemplateOffsets = request.seedTemplateOffsets?.map { Position(it.row, it.col) },
            ),
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
