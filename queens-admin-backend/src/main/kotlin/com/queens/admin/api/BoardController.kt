package com.queens.admin.api

import com.queens.admin.api.dto.BoardStateRequestDto
import com.queens.admin.api.dto.CellOperationRequestDto
import com.queens.admin.api.dto.CreateBoardRequestDto
import com.queens.admin.api.dto.OperationResultDto
import com.queens.admin.application.BoardOperationFacade
import com.queens.admin.infrastructure.mapper.BoardStateMapper
import com.queens.admin.infrastructure.mapper.OperationResultMapper
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/queens/admin/board")
class BoardController(
    private val boardOperationFacade: BoardOperationFacade,
    private val boardStateMapper: BoardStateMapper,
    private val operationResultMapper: OperationResultMapper,
) {
    @PostMapping("/create")
    fun createBoard(@RequestBody request: CreateBoardRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            boardOperationFacade.createBoard(request.size),
        )
    }

    @PostMapping("/clear")
    fun clearBoard(@RequestBody request: BoardStateRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            boardOperationFacade.clearBoard(boardStateMapper.toDomain(request.boardState)),
        )
    }

    @PostMapping("/validate")
    fun validateBoard(@RequestBody request: BoardStateRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            boardOperationFacade.validateBoard(boardStateMapper.toDomain(request.boardState)),
        )
    }

    @PostMapping("/set-color")
    fun setCellColor(@RequestBody request: CellOperationRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            boardOperationFacade.setCellColor(
                boardState = boardStateMapper.toDomain(request.boardState),
                row = request.row,
                col = request.col,
                color = request.color.orEmpty(),
            ),
        )
    }

    @PostMapping("/clear-color")
    fun clearCellColor(@RequestBody request: CellOperationRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            boardOperationFacade.clearCellColor(
                boardState = boardStateMapper.toDomain(request.boardState),
                row = request.row,
                col = request.col,
            ),
        )
    }

    @PostMapping("/place-flag")
    fun placeFlag(@RequestBody request: CellOperationRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            boardOperationFacade.placeFlag(
                boardState = boardStateMapper.toDomain(request.boardState),
                row = request.row,
                col = request.col,
            ),
        )
    }

    @PostMapping("/remove-flag")
    fun removeFlag(@RequestBody request: CellOperationRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            boardOperationFacade.removeFlag(
                boardState = boardStateMapper.toDomain(request.boardState),
                row = request.row,
                col = request.col,
            ),
        )
    }

    @PostMapping("/place-queen")
    fun placeQueen(@RequestBody request: CellOperationRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            boardOperationFacade.placeQueen(
                boardState = boardStateMapper.toDomain(request.boardState),
                row = request.row,
                col = request.col,
            ),
        )
    }

    @PostMapping("/remove-queen")
    fun removeQueen(@RequestBody request: CellOperationRequestDto): OperationResultDto {
        return operationResultMapper.toDto(
            boardOperationFacade.removeQueen(
                boardState = boardStateMapper.toDomain(request.boardState),
                row = request.row,
                col = request.col,
            ),
        )
    }
}
