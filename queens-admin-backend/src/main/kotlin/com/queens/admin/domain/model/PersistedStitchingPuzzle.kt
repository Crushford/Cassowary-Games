package com.queens.admin.domain.model

import java.time.Instant
import java.util.UUID

data class PersistedStitchingPuzzle(
    val id: UUID,
    val size: Int,
    val layout: String,
    val queens: String,
    val targetQueenCount: Int,
    val queenCount: Int,
    val orthogonalMinDistance: Int,
    val minimumGroupSize: Int,
    val generationStrategy: String,
    val pieceKind: String,
    val leftBlackoutSignature: List<Int>,
    val topBlackoutSignature: List<Int>,
    val leftBlackoutFingerprint: String,
    val topBlackoutFingerprint: String,
    val fingerprintKey: String,
    val pieceCategory: String,
    val canonicalSignature: String,
    val difficultyTier: PuzzleDifficultyTier? = null,
    val difficultyScore: Int? = null,
    val difficultySolverVersion: String? = null,
    val difficultyAssessedAt: Instant? = null,
    val createdAt: Instant,
)
