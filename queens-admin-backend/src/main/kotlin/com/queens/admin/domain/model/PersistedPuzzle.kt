package com.queens.admin.domain.model

import java.time.Instant
import java.util.UUID

data class PersistedPuzzle(
    val id: UUID,
    val size: Int,
    val layout: String,
    val queens: String,
    val canonicalSignature: String,
    val minimumGroupSize: Int,
    val generationStrategy: String,
    val createdAt: Instant,
)
