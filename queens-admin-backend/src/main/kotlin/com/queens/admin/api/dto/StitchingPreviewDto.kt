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

data class StitchingPreviewQuadrantDto(
    val pieceKind: String,
    val queenCount: Int,
    val targetQueenCount: Int,
    val blackoutCellCount: Int,
    val leftBlackoutSignature: List<Int>,
    val topBlackoutSignature: List<Int>,
    val board: StitchingPreviewBoardDto,
)

data class StitchingPreviewDto(
    val size: Int,
    val orthogonalMinDistance: Int,
    val minimumGroupSize: Int,
    val topLeft: StitchingPreviewQuadrantDto,
    val topRight: StitchingPreviewQuadrantDto,
    val bottomLeft: StitchingPreviewQuadrantDto,
    val bottomRight: StitchingPreviewQuadrantDto,
    val stitchedBoard: StitchingPreviewBoardDto,
)
