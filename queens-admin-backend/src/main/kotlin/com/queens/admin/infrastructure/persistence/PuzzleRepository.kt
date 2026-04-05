package com.queens.admin.infrastructure.persistence

import com.queens.admin.domain.model.PersistedPuzzle
import com.queens.admin.domain.model.PuzzleDifficultyTier
import java.time.Instant
import java.util.UUID
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.count
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.select
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.update
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.springframework.stereotype.Repository

@Repository
class PuzzleRepository {
    fun findByCanonicalSignature(canonicalSignature: String): PersistedPuzzle? =
        transaction {
            PuzzlesTable
                .selectAll()
                .where { PuzzlesTable.canonicalSignature eq canonicalSignature }
                .limit(1)
                .firstOrNull()
                ?.toPersistedPuzzle()
        }

    fun insert(puzzle: PersistedPuzzle): PersistedPuzzle =
        transaction {
            PuzzlesTable.insert {
                it[id] = puzzle.id
                it[size] = puzzle.size
                it[layout] = puzzle.layout
                it[queens] = puzzle.queens
                it[canonicalSignature] = puzzle.canonicalSignature
                it[minimumGroupSize] = puzzle.minimumGroupSize
                it[generationStrategy] = puzzle.generationStrategy
                it[createdAt] = puzzle.createdAt
                it[difficultyTier] = puzzle.difficultyTier?.name
                it[difficultyScore] = puzzle.difficultyScore
                it[difficultySolverVersion] = puzzle.difficultySolverVersion
                it[difficultyAssessedAt] = puzzle.difficultyAssessedAt
            }
            puzzle
        }

    fun findAll(): List<PersistedPuzzle> =
        transaction {
            PuzzlesTable
                .selectAll()
                .orderBy(PuzzlesTable.size to SortOrder.ASC, PuzzlesTable.createdAt to SortOrder.ASC)
                .map { row -> row.toPersistedPuzzle() }
        }

    fun countBySize(): Map<Int, Int> =
        transaction {
            val countExpression = PuzzlesTable.id.count()
            PuzzlesTable
                .select(PuzzlesTable.size, countExpression)
                .groupBy(PuzzlesTable.size)
                .associate { row ->
                    row[PuzzlesTable.size] to row[countExpression].toInt()
                }
        }

    fun updateDifficulty(
        puzzleId: UUID,
        difficultyTier: PuzzleDifficultyTier,
        difficultyScore: Int,
        difficultySolverVersion: String,
        difficultyAssessedAt: Instant,
    ) {
        transaction {
            PuzzlesTable.update({ PuzzlesTable.id eq puzzleId }) {
                it[PuzzlesTable.difficultyTier] = difficultyTier.name
                it[PuzzlesTable.difficultyScore] = difficultyScore
                it[PuzzlesTable.difficultySolverVersion] = difficultySolverVersion
                it[PuzzlesTable.difficultyAssessedAt] = difficultyAssessedAt
            }
        }
    }

    private fun ResultRow.toPersistedPuzzle(): PersistedPuzzle =
        PersistedPuzzle(
            id = this[PuzzlesTable.id].value,
            size = this[PuzzlesTable.size],
            layout = this[PuzzlesTable.layout],
            queens = this[PuzzlesTable.queens],
            canonicalSignature = this[PuzzlesTable.canonicalSignature],
            minimumGroupSize = this[PuzzlesTable.minimumGroupSize],
            generationStrategy = this[PuzzlesTable.generationStrategy],
            createdAt = this[PuzzlesTable.createdAt],
            difficultyTier = this[PuzzlesTable.difficultyTier]?.let(PuzzleDifficultyTier::valueOf),
            difficultyScore = this[PuzzlesTable.difficultyScore],
            difficultySolverVersion = this[PuzzlesTable.difficultySolverVersion],
            difficultyAssessedAt = this[PuzzlesTable.difficultyAssessedAt],
        )
}
