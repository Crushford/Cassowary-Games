package com.queens.admin.infrastructure.persistence

import java.util.UUID
import org.jetbrains.exposed.dao.id.UUIDTable
import org.jetbrains.exposed.sql.javatime.timestamp

object PuzzlesTable : UUIDTable("puzzles") {
    val size = integer("size")
    val layout = text("layout")
    val queens = text("queens")
    val targetQueenCount = integer("target_queen_count")
    val orthogonalMinDistance = integer("orthogonal_min_distance")
    val canonicalSignature = text("canonical_signature").uniqueIndex()
    val minimumGroupSize = integer("minimum_group_size")
    val generationStrategy = text("generation_strategy")
    val pieceKind = text("piece_kind").default("STANDARD")
    val leftBlackoutSignature = text("left_blackout_signature").default("")
    val topBlackoutSignature = text("top_blackout_signature").default("")
    val createdAt = timestamp("created_at")
    val difficultyTier = text("difficulty_tier").nullable()
    val difficultyScore = integer("difficulty_score").nullable()
    val difficultySolverVersion = text("difficulty_solver_version").nullable()
    val difficultyAssessedAt = timestamp("difficulty_assessed_at").nullable()
}
