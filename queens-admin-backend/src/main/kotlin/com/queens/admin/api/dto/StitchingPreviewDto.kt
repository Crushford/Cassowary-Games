package com.queens.admin.api.dto

data class StitchingPreviewCellDto(
    val state: String,
    val groupId: String? = null,
    val groupSlot: Int? = null,
)

data class StitchingPreviewBoardDto(
    val width: Int,
    val height: Int,
    val cells: List<List<StitchingPreviewCellDto>>,
)

data class StitchingPreviewChunkDto(
    val pieceKind: String,
    val queenCount: Int,
    val targetQueenCount: Int,
    val blackoutCellCount: Int,
    val leftBlackoutSignature: List<Int>,
    val topBlackoutSignature: List<Int>,
    val board: StitchingPreviewBoardDto,
)

data class StitchingPreviewSeamDto(
    val fromChunkIndex: Int,
    val toChunkIndex: Int,
    val bottomSignature: List<Int>,
    val topSignature: List<Int>,
)

data class StitchingPreviewDto(
    val size: Int,
    val orthogonalMinDistance: Int,
    val minimumGroupSize: Int,
    val chunks: List<StitchingPreviewChunkDto>,
    val seams: List<StitchingPreviewSeamDto>,
    val stitchedBoard: StitchingPreviewBoardDto,
)
