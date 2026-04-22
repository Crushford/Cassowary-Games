package com.queens.admin.infrastructure.persistence

import org.jetbrains.exposed.dao.id.UUIDTable
import org.jetbrains.exposed.sql.javatime.timestamp

object StitchingPuzzlesTable : UUIDTable("stitching_puzzles") {
    val size = integer("size")
    val layout = text("layout")
    val queens = text("queens")
    val targetQueenCount = integer("target_queen_count")
    val queenCount = integer("queen_count")
    val orthogonalMinDistance = integer("orthogonal_min_distance")
    val minimumGroupSize = integer("minimum_group_size")
    val generationStrategy = text("generation_strategy")
    val pieceKind = text("piece_kind")
    val leftBlackoutSignature = text("left_blackout_signature")
    val topBlackoutSignature = text("top_blackout_signature")
    val leftBlackoutFingerprint = text("left_blackout_fingerprint")
    val topBlackoutFingerprint = text("top_blackout_fingerprint")
    val fingerprintKey = text("fingerprint_key")
    val isSeed = bool("is_seed").default(false)
    val sourcePuzzleId = uuid("source_puzzle_id").nullable()
    val pieceCategory = text("piece_category")
    val canonicalSignature = text("canonical_signature").uniqueIndex()
    val difficultyTier = text("difficulty_tier").nullable()
    val difficultyScore = integer("difficulty_score").nullable()
    val difficultySolverVersion = text("difficulty_solver_version").nullable()
    val difficultyAssessedAt = timestamp("difficulty_assessed_at").nullable()
    val createdAt = timestamp("created_at")
}
