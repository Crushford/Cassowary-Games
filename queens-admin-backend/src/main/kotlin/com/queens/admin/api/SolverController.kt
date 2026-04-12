package com.queens.admin.api

import com.queens.admin.api.dto.BoardStateRequestDto
import com.queens.admin.api.dto.BuiltInSolverStepDto
import com.queens.admin.api.dto.OperationResultDto
import com.queens.admin.api.dto.RunSolverPatternRequestDto
import com.queens.admin.api.dto.RunSolverRuleRequestDto
import com.queens.admin.api.dto.SolverConfigDto
import com.queens.admin.api.dto.SolverPatternCellDto
import com.queens.admin.api.dto.SolverPatternConfigDto
import com.queens.admin.api.dto.SolverPatternOffsetDto
import com.queens.admin.api.dto.UpsertSolverPatternRequestDto
import com.queens.admin.application.SolverConfigService
import com.queens.admin.application.SolverPatternCatalogService
import com.queens.admin.application.SolverWorkflowService
import com.queens.admin.domain.model.PersistedSolverPattern
import com.queens.admin.domain.model.PuzzleDifficultyTier
import com.queens.admin.domain.model.SolverPatternCellRecord
import com.queens.admin.domain.model.SolverPatternOffsetRecord
import com.queens.admin.infrastructure.mapper.BoardStateMapper
import com.queens.admin.infrastructure.mapper.OperationResultMapper
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/queens/admin/solver")
class SolverController(
    private val solverWorkflowService: SolverWorkflowService,
    private val solverConfigService: SolverConfigService,
    private val solverPatternCatalogService: SolverPatternCatalogService,
    private val boardStateMapper: BoardStateMapper,
    private val operationResultMapper: OperationResultMapper,
) {
    private fun PuzzleDifficultyTier.toApiValue(): String = name.lowercase().replace('_', '-')

    private fun parseDifficultyTier(value: String): PuzzleDifficultyTier = PuzzleDifficultyTier.valueOf(value.uppercase().replace('-', '_'))

    @GetMapping("/config")
    fun getSolverConfig(): SolverConfigDto =
        solverConfigService.loadConfig().let { config ->
            SolverConfigDto(
                builtInSteps = config.builtInSteps.map { step ->
                    BuiltInSolverStepDto(
                        id = step.id,
                        label = step.label,
                        description = step.description,
                        difficultyTier = step.difficultyTier.toApiValue(),
                        enabled = step.enabled,
                        sortOrder = step.sortOrder,
                    )
                },
                patterns = config.patterns.map(::toSolverPatternConfigDto),
            )
        }

    @PostMapping("/patterns")
    fun createSolverPattern(@RequestBody request: UpsertSolverPatternRequestDto): SolverPatternConfigDto =
        toSolverPatternConfigDto(
            solverPatternCatalogService.create(request.toUpsertRequest()),
        )

    @PutMapping("/patterns/{patternId}")
    fun updateSolverPattern(
        @PathVariable patternId: String,
        @RequestBody request: UpsertSolverPatternRequestDto,
    ): SolverPatternConfigDto =
        toSolverPatternConfigDto(
            solverPatternCatalogService.update(patternId, request.toUpsertRequest()),
        )

    @PostMapping("/clear-marks")
    fun clearSolverMarks(@RequestBody request: BoardStateRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            solverWorkflowService.clearSolverMarks(boardStateMapper.toDomain(request.boardState)),
        )
    }

    @PostMapping("/run-next-step")
    fun runNextStep(@RequestBody request: BoardStateRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            solverWorkflowService.runNextSolverStep(boardStateMapper.toDomain(request.boardState)),
        )
    }

    @PostMapping("/single-color-group")
    fun runSingleColorGroupStep(@RequestBody request: BoardStateRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            solverWorkflowService.runSingleColorGroupSolverRule(
                boardStateMapper.toDomain(request.boardState),
            ),
        )
    }

    @PostMapping("/run-rule")
    fun runSpecificRule(@RequestBody request: RunSolverRuleRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            solverWorkflowService.runSpecificSolverRule(
                boardState = boardStateMapper.toDomain(request.boardState),
                ruleName = request.ruleName,
            ),
        )
    }

    @PostMapping("/pattern")
    fun runPattern(@RequestBody request: RunSolverPatternRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            solverWorkflowService.runSolverPattern(
                boardState = boardStateMapper.toDomain(request.boardState),
                pattern =
                    com.queens.admin.domain.service.SolverPatternService.SolverPatternDefinition(
                        id = request.pattern.id,
                        size = request.pattern.size,
                        cells =
                            request.pattern.cells.map { cell ->
                                com.queens.admin.domain.service.SolverPatternService.SolverPatternCell(
                                    row = cell.row,
                                    col = cell.col,
                                    activeSquare = cell.activeSquare == true,
                                )
                            },
                        outputFlags =
                            request.pattern.outputFlags.map { offset ->
                                com.queens.admin.domain.service.SolverPatternService.SolverPatternOffset(
                                    row = offset.row,
                                    col = offset.col,
                                )
                            },
                    ),
            ),
        )
    }

    @PostMapping("/run-all")
    fun runAllSteps(@RequestBody request: BoardStateRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            solverWorkflowService.runAllSolverSteps(boardStateMapper.toDomain(request.boardState)),
        )
    }

    private fun UpsertSolverPatternRequestDto.toUpsertRequest(): SolverPatternCatalogService.UpsertSolverPatternRequest =
        SolverPatternCatalogService.UpsertSolverPatternRequest(
            id = id,
            name = name,
            size = size,
            cells = cells.map { cell ->
                SolverPatternCellRecord(
                    row = cell.row,
                    col = cell.col,
                    activeSquare = cell.activeSquare == true,
                )
            },
            outputFlags = outputFlags.map { offset ->
                SolverPatternOffsetRecord(
                    row = offset.row,
                    col = offset.col,
                )
            },
            difficultyTier = parseDifficultyTier(difficultyTier),
            enabled = enabled,
            sortOrder = sortOrder,
        )

    private fun toSolverPatternConfigDto(pattern: PersistedSolverPattern): SolverPatternConfigDto =
        SolverPatternConfigDto(
            id = pattern.id,
            name = pattern.name,
            size = pattern.size,
            cells = pattern.cells.map { cell ->
                SolverPatternCellDto(
                    row = cell.row,
                    col = cell.col,
                    activeSquare = cell.activeSquare,
                )
            },
            outputFlags = pattern.outputFlags.map { offset ->
                SolverPatternOffsetDto(
                    row = offset.row,
                    col = offset.col,
                )
            },
            difficultyTier = pattern.difficultyTier.toApiValue(),
            enabled = pattern.enabled,
            sortOrder = pattern.sortOrder,
            createdAt = pattern.createdAt.toString(),
            updatedAt = pattern.updatedAt.toString(),
        )
}
