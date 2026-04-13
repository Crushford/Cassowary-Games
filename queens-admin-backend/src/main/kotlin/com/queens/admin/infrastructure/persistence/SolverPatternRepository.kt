package com.queens.admin.infrastructure.persistence

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.queens.admin.domain.model.PersistedSolverPattern
import com.queens.admin.domain.model.PuzzleDifficultyTier
import com.queens.admin.domain.model.SolverPatternCellRecord
import com.queens.admin.domain.model.SolverPatternOffsetRecord
import java.time.Instant
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.springframework.stereotype.Repository

@Repository
class SolverPatternRepository(
    private val objectMapper: ObjectMapper,
) {
    data class SolverPatternExportFingerprint(
        val count: Long,
        val latestUpdatedAt: Instant?,
    )

    fun findAll(): List<PersistedSolverPattern> =
        transaction {
            SolverPatternsTable
                .selectAll()
                .orderBy(SolverPatternsTable.sortOrder to SortOrder.ASC, SolverPatternsTable.id to SortOrder.ASC)
                .map { row -> row.toPersistedSolverPattern() }
        }

    fun findById(id: String): PersistedSolverPattern? =
        transaction {
            SolverPatternsTable
                .selectAll()
                .where { SolverPatternsTable.id eq id }
                .limit(1)
                .firstOrNull()
                ?.toPersistedSolverPattern()
        }

    fun insert(pattern: PersistedSolverPattern): PersistedSolverPattern =
        transaction {
            SolverPatternsTable.insert {
                it[id] = pattern.id
                it[name] = pattern.name
                it[size] = pattern.size
                it[cellsJson] = objectMapper.writeValueAsString(pattern.cells)
                it[outputFlagsJson] = objectMapper.writeValueAsString(pattern.outputFlags)
                it[difficultyTier] = pattern.difficultyTier.name
                it[enabled] = pattern.enabled
                it[sortOrder] = pattern.sortOrder
                it[createdAt] = pattern.createdAt
                it[updatedAt] = pattern.updatedAt
            }
            pattern
        }

    fun update(pattern: PersistedSolverPattern): PersistedSolverPattern =
        transaction {
            SolverPatternsTable.update({ SolverPatternsTable.id eq pattern.id }) {
                it[name] = pattern.name
                it[size] = pattern.size
                it[cellsJson] = objectMapper.writeValueAsString(pattern.cells)
                it[outputFlagsJson] = objectMapper.writeValueAsString(pattern.outputFlags)
                it[difficultyTier] = pattern.difficultyTier.name
                it[enabled] = pattern.enabled
                it[sortOrder] = pattern.sortOrder
                it[updatedAt] = pattern.updatedAt
            }
            pattern
        }

    fun exportFingerprint(): SolverPatternExportFingerprint =
        transaction {
            val count = SolverPatternsTable.selectAll().count()
            val latestUpdatedAt =
                SolverPatternsTable
                    .select(SolverPatternsTable.updatedAt)
                    .orderBy(SolverPatternsTable.updatedAt to SortOrder.DESC, SolverPatternsTable.id to SortOrder.ASC)
                    .limit(1)
                    .firstOrNull()
                    ?.get(SolverPatternsTable.updatedAt)

            SolverPatternExportFingerprint(
                count = count,
                latestUpdatedAt = latestUpdatedAt,
            )
        }

    private fun ResultRow.toPersistedSolverPattern(): PersistedSolverPattern =
        PersistedSolverPattern(
            id = this[SolverPatternsTable.id],
            name = this[SolverPatternsTable.name],
            size = this[SolverPatternsTable.size],
            cells = objectMapper.readValue(
                this[SolverPatternsTable.cellsJson],
                object : TypeReference<List<SolverPatternCellRecord>>() {},
            ),
            outputFlags = objectMapper.readValue(
                this[SolverPatternsTable.outputFlagsJson],
                object : TypeReference<List<SolverPatternOffsetRecord>>() {},
            ),
            difficultyTier = PuzzleDifficultyTier.valueOf(this[SolverPatternsTable.difficultyTier]),
            enabled = this[SolverPatternsTable.enabled],
            sortOrder = this[SolverPatternsTable.sortOrder],
            createdAt = this[SolverPatternsTable.createdAt],
            updatedAt = this[SolverPatternsTable.updatedAt],
        )
}
