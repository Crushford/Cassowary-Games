package com.queens.admin.api

import com.queens.admin.api.dto.BoardStateRequestDto
import com.queens.admin.api.dto.OperationResultDto
import com.queens.admin.api.dto.RunSolverRuleRequestDto
import com.queens.admin.application.SolverWorkflowService
import com.queens.admin.infrastructure.mapper.BoardStateMapper
import com.queens.admin.infrastructure.mapper.OperationResultMapper
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/queens/admin/solver")
class SolverController(
    private val solverWorkflowService: SolverWorkflowService,
    private val boardStateMapper: BoardStateMapper,
    private val operationResultMapper: OperationResultMapper,
) {
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

    @PostMapping("/run-rule")
    fun runSpecificRule(@RequestBody request: RunSolverRuleRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            solverWorkflowService.runSpecificSolverRule(
                boardState = boardStateMapper.toDomain(request.boardState),
                ruleName = request.ruleName,
            ),
        )
    }

    @PostMapping("/run-all")
    fun runAllSteps(@RequestBody request: BoardStateRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            solverWorkflowService.runAllSolverSteps(boardStateMapper.toDomain(request.boardState)),
        )
    }
}
