package com.queens.admin.infrastructure.persistence

import java.util.UUID
import org.jetbrains.exposed.dao.id.UUIDTable
import org.jetbrains.exposed.sql.javatime.timestamp

object PuzzlesTable : UUIDTable("puzzles") {
    val size = integer("size")
    val layout = text("layout")
    val queens = text("queens")
    val canonicalSignature = text("canonical_signature").uniqueIndex()
    val minimumGroupSize = integer("minimum_group_size")
    val generationStrategy = text("generation_strategy")
    val createdAt = timestamp("created_at")
}
