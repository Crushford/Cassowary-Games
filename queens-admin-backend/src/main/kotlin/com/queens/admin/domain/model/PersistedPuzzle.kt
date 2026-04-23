package com.queens.admin.domain.model

import java.time.Instant
import java.util.UUID

data class PersistedPuzzle(
    val id: UUID,
    val size: Int,
    val layout: String,
    val queens: String,
    val targetQueenCount: Int,
    val orthogonalMinDistance: Int,
    val canonicalSignature: String,
    val minimumGroupSize: Int,
    val generationStrategy: String,
    val pieceKind: String = "STANDARD",
    val leftBlackoutSignature: String = "",
    val topBlackoutSignature: String = "",
    val createdAt: Instant,
    val difficultyTier: PuzzleDifficultyTier? = null,
    val difficultyScore: Int? = null,
    val difficultySolverVersion: String? = null,
    val difficultyAssessedAt: Instant? = null,
)
