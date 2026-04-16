package com.queens.admin.api

import com.queens.admin.api.dto.BoardStateRequestDto
import com.queens.admin.api.dto.BatchGenerationRequestDto
import com.queens.admin.api.dto.BatchGenerationStartedDto
import com.queens.admin.api.dto.BatchGenerationStatusDto
import com.queens.admin.api.dto.CatalogPuzzleSelectionDto
import com.queens.admin.api.dto.CreateBoardRequestDto
import com.queens.admin.api.dto.DeletePuzzleCatalogGroupRequestDto
import com.queens.admin.api.dto.DeletePuzzleCatalogGroupResultDto
import com.queens.admin.api.dto.ExpandGroupRequestDto
import com.queens.admin.api.dto.GenerationJobStartedDto
import com.queens.admin.api.dto.GenerationJobStatusDto
import com.queens.admin.api.dto.OperationResultDto
import com.queens.admin.api.dto.PuzzleCatalogGroupDto
import com.queens.admin.api.dto.PuzzleCatalogStatsDto
import com.queens.admin.api.dto.ResolveMaxQueensRequestDto
import com.queens.admin.api.dto.ResolveMaxQueensResultDto
import com.queens.admin.api.dto.StitchingPreviewDto
import com.queens.admin.api.dto.SystemLoadDto
import com.queens.admin.application.BackendLoadService
import com.queens.admin.application.BatchGenerationService
import com.queens.admin.application.GenerationJobService
import com.queens.admin.application.GenerationWorkflowService
import com.queens.admin.application.PuzzleCatalogService
import com.queens.admin.application.StitchingPreviewService
import com.queens.admin.domain.model.Position
import com.queens.admin.domain.model.PuzzleDifficultyTier
import com.queens.admin.domain.service.PersistedPuzzleBoardCodecService
import com.queens.admin.infrastructure.persistence.PuzzleRepository
import com.queens.admin.infrastructure.mapper.BatchGenerationMapper
import com.queens.admin.infrastructure.mapper.BoardStateMapper
import com.queens.admin.infrastructure.mapper.GenerationJobMapper
import com.queens.admin.infrastructure.mapper.OperationResultMapper
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
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
    private val stitchingPreviewService: StitchingPreviewService,
    private val persistedPuzzleBoardCodecService: PersistedPuzzleBoardCodecService,
    private val boardStateMapper: BoardStateMapper,
    private val batchGenerationMapper: BatchGenerationMapper,
    private val generationJobMapper: GenerationJobMapper,
    private val operationResultMapper: OperationResultMapper,
) {
    private fun PuzzleDifficultyTier.toApiValue(): String = name.lowercase().replace('_', '-')

    private fun parseDifficultyTier(value: String): PuzzleDifficultyTier = PuzzleDifficultyTier.valueOf(value.uppercase().replace('-', '_'))

    @GetMapping("/catalog-stats")
    fun getCatalogStats(): PuzzleCatalogStatsDto {
        val countsBySize = puzzleCatalogService.countBySize()
        val countsBySizeAndDistance =
            puzzleCatalogService.countBySizeAndDistance()
                .toSortedMap(compareBy<Pair<Int, Int>>({ it.first }, { it.second }))
                .mapKeys { (sizeAndDistance, _) ->
                    val (size, distance) = sizeAndDistance
                    "${size}x${size}|d=$distance"
                }
        val groups =
            puzzleCatalogService.countByRulesetGroup()
                .sortedWith(
                    compareBy<PuzzleRepository.PuzzleCatalogGroupCount> { it.size }
                        .thenBy { it.orthogonalMinDistance }
                        .thenBy { it.targetQueenCount }
                        .thenBy { it.minimumGroupSize }
                        .thenBy { it.difficultyTier?.ordinal ?: Int.MAX_VALUE },
                )
                .map { group ->
                    PuzzleCatalogGroupDto(
                        size = group.size,
                        orthogonalMinDistance = group.orthogonalMinDistance,
                        targetQueenCount = group.targetQueenCount,
                        minimumGroupSize = group.minimumGroupSize,
                        difficulty = group.difficultyTier?.toApiValue(),
                        count = group.count,
                    )
                }
        return PuzzleCatalogStatsDto(
            totalPuzzles = countsBySize.values.sum(),
            countsBySize = countsBySize
                .toSortedMap()
                .mapKeys { (size, _) -> "${size}x${size}" },
            countsBySizeAndDistance = countsBySizeAndDistance,
            groups = groups,
        )
    }

    @GetMapping("/catalog-random-puzzle")
    fun getRandomCatalogPuzzle(
        @RequestParam(required = false) size: Int?,
        @RequestParam(required = false) orthogonalMinDistance: Int?,
        @RequestParam(required = false) targetQueenCount: Int?,
        @RequestParam(required = false) minimumGroupSize: Int?,
        @RequestParam(required = false) difficulty: String?,
    ): ResponseEntity<CatalogPuzzleSelectionDto> {
        val puzzle =
            puzzleCatalogService.findRandomFiltered(
                size = size,
                orthogonalMinDistance = orthogonalMinDistance,
                targetQueenCount = targetQueenCount,
                minimumGroupSize = minimumGroupSize,
                difficultyTier = difficulty?.let(::parseDifficultyTier),
            ) ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok(
            CatalogPuzzleSelectionDto(
                puzzleId = puzzle.id.toString(),
                size = puzzle.size,
                orthogonalMinDistance = puzzle.orthogonalMinDistance,
                targetQueenCount = puzzle.targetQueenCount,
                minimumGroupSize = puzzle.minimumGroupSize,
                difficulty = puzzle.difficultyTier?.toApiValue(),
                boardState =
                    boardStateMapper.toDto(
                        persistedPuzzleBoardCodecService.decode(puzzle),
                    ),
            ),
        )
    }

    @GetMapping("/catalog-puzzle/{puzzleId}")
    fun getCatalogPuzzleById(@PathVariable puzzleId: String): ResponseEntity<CatalogPuzzleSelectionDto> {
        val puzzle = puzzleCatalogService.findById(java.util.UUID.fromString(puzzleId))
            ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok(
            CatalogPuzzleSelectionDto(
                puzzleId = puzzle.id.toString(),
                size = puzzle.size,
                orthogonalMinDistance = puzzle.orthogonalMinDistance,
                targetQueenCount = puzzle.targetQueenCount,
                minimumGroupSize = puzzle.minimumGroupSize,
                difficulty = puzzle.difficultyTier?.toApiValue(),
                boardState = boardStateMapper.toDto(persistedPuzzleBoardCodecService.decode(puzzle)),
            ),
        )
    }

    @PostMapping("/catalog-groups/delete")
    fun deleteCatalogGroup(
        @RequestBody request: DeletePuzzleCatalogGroupRequestDto,
    ): DeletePuzzleCatalogGroupResultDto =
        DeletePuzzleCatalogGroupResultDto(
            deletedCount =
                puzzleCatalogService.deleteByRulesetGroup(
                    size = request.size,
                orthogonalMinDistance = request.orthogonalMinDistance,
                targetQueenCount = request.targetQueenCount,
                minimumGroupSize = request.minimumGroupSize,
                difficultyTier = request.difficulty?.let(::parseDifficultyTier),
            ),
        )

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

    @GetMapping("/stitching-preview")
    fun getStitchingPreview(): StitchingPreviewDto = stitchingPreviewService.buildPreview()

    @PostMapping("/resolve-max-queens")
    fun resolveMaxQueens(@RequestBody request: ResolveMaxQueensRequestDto): ResolveMaxQueensResultDto {
        val result = generationWorkflowService.resolveMaxQueenCount(
            size = request.size,
            orthogonalMinDistance = request.orthogonalMinDistance ?: request.size,
        )
        return ResolveMaxQueensResultDto(
            size = result.size,
            orthogonalMinDistance = result.orthogonalMinDistance,
            maxQueenCount = result.maxQueenCount,
            elapsedMs = result.elapsedMs,
        )
    }

    @PostMapping("/batches")
    fun startBatchGeneration(@RequestBody request: BatchGenerationRequestDto): BatchGenerationStartedDto {
        return batchGenerationMapper.toStartedDto(
            batchGenerationService.startBatch(
                sizes = request.sizes,
                orthogonalMinDistances = request.orthogonalMinDistances,
                strategies = request.strategies,
                runsPerCombination = request.runsPerCombination,
                runMode = request.runMode,
                queenCountMode = request.queenCountMode,
                targetQueenCount = request.targetQueenCount,
                orthogonalMinDistance = request.orthogonalMinDistance,
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
                queenCountMode = request.queenCountMode ?: "exact",
                targetQueenCount = request.targetQueenCount ?: request.size,
                orthogonalMinDistance = request.orthogonalMinDistance ?: request.size,
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
                queenCountMode = request.queenCountMode ?: "exact",
                targetQueenCount = request.targetQueenCount ?: request.size,
                orthogonalMinDistance = request.orthogonalMinDistance ?: request.size,
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
