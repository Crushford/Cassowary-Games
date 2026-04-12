package com.queens.admin.infrastructure.persistence

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp

object SolverPatternsTable : Table("solver_patterns") {
    val id = text("id")
    val name = text("name")
    val size = integer("size")
    val cellsJson = text("cells_json")
    val outputFlagsJson = text("output_flags_json")
    val difficultyTier = text("difficulty_tier")
    val enabled = bool("enabled")
    val sortOrder = integer("sort_order")
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")

    override val primaryKey = PrimaryKey(id)
}
