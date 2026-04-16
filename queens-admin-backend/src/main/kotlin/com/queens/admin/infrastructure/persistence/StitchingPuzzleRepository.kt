package com.queens.admin.infrastructure.persistence

import com.queens.admin.domain.model.PersistedStitchingPuzzle
import com.queens.admin.domain.model.PuzzleDifficultyTier
import com.queens.admin.domain.service.StitchingFingerprintService
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.count
import org.jetbrains.exposed.sql.max
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.springframework.stereotype.Repository

@Repository
class StitchingPuzzleRepository(
    private val stitchingFingerprintService: StitchingFingerprintService,
) {
    data class FingerprintBucketCount(
        val fingerprintKey: String,
        val pieceCategory: String,
        val pieceKind: String,
        val size: Int,
        val orthogonalMinDistance: Int,
        val targetQueenCount: Int,
        val leftBlackoutFingerprint: String,
        val topBlackoutFingerprint: String,
        val count: Int,
    )

    fun save(puzzle: PersistedStitchingPuzzle): PersistedStitchingPuzzle =
        transaction {
            StitchingPuzzlesTable.insert {
                it[id] = puzzle.id
                it[size] = puzzle.size
                it[layout] = puzzle.layout
                it[queens] = puzzle.queens
                it[targetQueenCount] = puzzle.targetQueenCount
                it[queenCount] = puzzle.queenCount
                it[orthogonalMinDistance] = puzzle.orthogonalMinDistance
                it[minimumGroupSize] = puzzle.minimumGroupSize
                it[generationStrategy] = puzzle.generationStrategy
                it[pieceKind] = puzzle.pieceKind
                it[leftBlackoutSignature] = stitchingFingerprintService.serializeSignature(puzzle.leftBlackoutSignature)
                it[topBlackoutSignature] = stitchingFingerprintService.serializeSignature(puzzle.topBlackoutSignature)
                it[leftBlackoutFingerprint] = puzzle.leftBlackoutFingerprint
                it[topBlackoutFingerprint] = puzzle.topBlackoutFingerprint
                it[fingerprintKey] = puzzle.fingerprintKey
                it[pieceCategory] = puzzle.pieceCategory
                it[canonicalSignature] = puzzle.canonicalSignature
                it[difficultyTier] = puzzle.difficultyTier?.name
                it[difficultyScore] = puzzle.difficultyScore
                it[difficultySolverVersion] = puzzle.difficultySolverVersion
                it[difficultyAssessedAt] = puzzle.difficultyAssessedAt
                it[createdAt] = puzzle.createdAt
            }
            puzzle
        }

    fun existsByCanonicalSignature(canonicalSignature: String): Boolean =
        transaction {
            StitchingPuzzlesTable
                .selectAll()
                .where { StitchingPuzzlesTable.canonicalSignature eq canonicalSignature }
                .limit(1)
                .any()
        }

    fun findByCanonicalSignature(canonicalSignature: String): PersistedStitchingPuzzle? =
        transaction {
            StitchingPuzzlesTable
                .selectAll()
                .where { StitchingPuzzlesTable.canonicalSignature eq canonicalSignature }
                .limit(1)
                .firstOrNull()
                ?.toPersistedStitchingPuzzle()
        }

    fun findByFingerprintKey(key: String): List<PersistedStitchingPuzzle> =
        transaction {
            StitchingPuzzlesTable
                .selectAll()
                .where { StitchingPuzzlesTable.fingerprintKey eq key }
                .orderBy(StitchingPuzzlesTable.createdAt to SortOrder.ASC)
                .map { row -> row.toPersistedStitchingPuzzle() }
        }

    fun existsByFingerprintKey(key: String): Boolean =
        transaction {
            StitchingPuzzlesTable
                .selectAll()
                .where { StitchingPuzzlesTable.fingerprintKey eq key }
                .limit(1)
                .any()
        }

    fun findMaxQueenCountByFingerprintKey(key: String): Int? =
        transaction {
            val maxExpression = StitchingPuzzlesTable.queenCount.max()
            StitchingPuzzlesTable
                .select(maxExpression)
                .where { StitchingPuzzlesTable.fingerprintKey eq key }
                .firstOrNull()
                ?.get(maxExpression)
        }

    fun findByPieceCategory(category: String): List<PersistedStitchingPuzzle> =
        transaction {
            StitchingPuzzlesTable
                .selectAll()
                .where { StitchingPuzzlesTable.pieceCategory eq category }
                .orderBy(StitchingPuzzlesTable.createdAt to SortOrder.ASC)
                .map { row -> row.toPersistedStitchingPuzzle() }
        }

    fun findAll(): List<PersistedStitchingPuzzle> =
        transaction {
            StitchingPuzzlesTable
                .selectAll()
                .orderBy(StitchingPuzzlesTable.size to SortOrder.ASC, StitchingPuzzlesTable.createdAt to SortOrder.ASC)
                .map { row -> row.toPersistedStitchingPuzzle() }
        }

    fun countByFingerprintKey(): List<FingerprintBucketCount> =
        transaction {
            val countExpression = StitchingPuzzlesTable.id.count()
            StitchingPuzzlesTable
                .select(
                    StitchingPuzzlesTable.fingerprintKey,
                    StitchingPuzzlesTable.pieceCategory,
                    StitchingPuzzlesTable.pieceKind,
                    StitchingPuzzlesTable.size,
                    StitchingPuzzlesTable.orthogonalMinDistance,
                    StitchingPuzzlesTable.targetQueenCount,
                    StitchingPuzzlesTable.leftBlackoutFingerprint,
                    StitchingPuzzlesTable.topBlackoutFingerprint,
                    countExpression,
                )
                .groupBy(
                    StitchingPuzzlesTable.fingerprintKey,
                    StitchingPuzzlesTable.pieceCategory,
                    StitchingPuzzlesTable.pieceKind,
                    StitchingPuzzlesTable.size,
                    StitchingPuzzlesTable.orthogonalMinDistance,
                    StitchingPuzzlesTable.targetQueenCount,
                    StitchingPuzzlesTable.leftBlackoutFingerprint,
                    StitchingPuzzlesTable.topBlackoutFingerprint,
                )
                .map { row ->
                    FingerprintBucketCount(
                        fingerprintKey = row[StitchingPuzzlesTable.fingerprintKey],
                        pieceCategory = row[StitchingPuzzlesTable.pieceCategory],
                        pieceKind = row[StitchingPuzzlesTable.pieceKind],
                        size = row[StitchingPuzzlesTable.size],
                        orthogonalMinDistance = row[StitchingPuzzlesTable.orthogonalMinDistance],
                        targetQueenCount = row[StitchingPuzzlesTable.targetQueenCount],
                        leftBlackoutFingerprint = row[StitchingPuzzlesTable.leftBlackoutFingerprint],
                        topBlackoutFingerprint = row[StitchingPuzzlesTable.topBlackoutFingerprint],
                        count = row[countExpression].toInt(),
                    )
                }
        }

    private fun ResultRow.toPersistedStitchingPuzzle(): PersistedStitchingPuzzle =
        PersistedStitchingPuzzle(
            id = this[StitchingPuzzlesTable.id].value,
            size = this[StitchingPuzzlesTable.size],
            layout = this[StitchingPuzzlesTable.layout],
            queens = this[StitchingPuzzlesTable.queens],
            targetQueenCount = this[StitchingPuzzlesTable.targetQueenCount],
            queenCount = this[StitchingPuzzlesTable.queenCount],
            orthogonalMinDistance = this[StitchingPuzzlesTable.orthogonalMinDistance],
            minimumGroupSize = this[StitchingPuzzlesTable.minimumGroupSize],
            generationStrategy = this[StitchingPuzzlesTable.generationStrategy],
            pieceKind = this[StitchingPuzzlesTable.pieceKind],
            leftBlackoutSignature = stitchingFingerprintService.deserializeSignature(
                this[StitchingPuzzlesTable.leftBlackoutSignature],
                this[StitchingPuzzlesTable.size],
            ),
            topBlackoutSignature = stitchingFingerprintService.deserializeSignature(
                this[StitchingPuzzlesTable.topBlackoutSignature],
                this[StitchingPuzzlesTable.size],
            ),
            leftBlackoutFingerprint = this[StitchingPuzzlesTable.leftBlackoutFingerprint],
            topBlackoutFingerprint = this[StitchingPuzzlesTable.topBlackoutFingerprint],
            fingerprintKey = this[StitchingPuzzlesTable.fingerprintKey],
            pieceCategory = this[StitchingPuzzlesTable.pieceCategory],
            canonicalSignature = this[StitchingPuzzlesTable.canonicalSignature],
            difficultyTier = this[StitchingPuzzlesTable.difficultyTier]?.let(PuzzleDifficultyTier::valueOf),
            difficultyScore = this[StitchingPuzzlesTable.difficultyScore],
            difficultySolverVersion = this[StitchingPuzzlesTable.difficultySolverVersion],
            difficultyAssessedAt = this[StitchingPuzzlesTable.difficultyAssessedAt],
            createdAt = this[StitchingPuzzlesTable.createdAt],
        )
}
