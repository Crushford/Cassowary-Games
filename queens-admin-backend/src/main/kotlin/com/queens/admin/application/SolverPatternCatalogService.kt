package com.queens.admin.application

import com.queens.admin.domain.model.PersistedSolverPattern
import com.queens.admin.domain.model.PuzzleDifficultyTier
import com.queens.admin.domain.model.SolverPatternCellRecord
import com.queens.admin.domain.model.SolverPatternOffsetRecord
import com.queens.admin.infrastructure.persistence.SolverPatternRepository
import java.time.Instant
import org.springframework.stereotype.Service

@Service
class SolverPatternCatalogService(
    private val solverPatternRepository: SolverPatternRepository,
) {
    data class UpsertSolverPatternRequest(
        val id: String,
        val name: String,
        val size: Int,
        val cells: List<SolverPatternCellRecord>,
        val outputFlags: List<SolverPatternOffsetRecord>,
        val difficultyTier: PuzzleDifficultyTier,
        val enabled: Boolean,
        val sortOrder: Int,
    )

    fun findAll(): List<PersistedSolverPattern> = solverPatternRepository.findAll()

    fun create(request: UpsertSolverPatternRequest): PersistedSolverPattern {
        val normalized = normalizeForPersistence(request)
        val now = Instant.now()
        return solverPatternRepository.insert(
            PersistedSolverPattern(
                id = normalized.id,
                name = normalized.name,
                size = normalized.size,
                cells = normalized.cells,
                outputFlags = normalized.outputFlags,
                difficultyTier = normalized.difficultyTier,
                enabled = normalized.enabled,
                sortOrder = normalized.sortOrder,
                createdAt = now,
                updatedAt = now,
            ),
        )
    }

    fun update(id: String, request: UpsertSolverPatternRequest): PersistedSolverPattern {
        val existing = requireNotNull(solverPatternRepository.findById(id)) {
            "Solver pattern $id was not found."
        }
        val normalized = normalizeForPersistence(request.copy(id = id))
        return solverPatternRepository.update(
            existing.copy(
                name = normalized.name,
                size = normalized.size,
                cells = normalized.cells,
                outputFlags = normalized.outputFlags,
                difficultyTier = normalized.difficultyTier,
                enabled = normalized.enabled,
                sortOrder = normalized.sortOrder,
                updatedAt = Instant.now(),
            ),
        )
    }

    companion object {
        fun normalizeForPersistence(request: UpsertSolverPatternRequest): UpsertSolverPatternRequest {
            val activeCells = request.cells.filter { it.activeSquare }
            val relevantPoints = buildList {
                addAll(activeCells.map { it.row to it.col })
                addAll(request.outputFlags.map { it.row to it.col })
            }

            if (relevantPoints.isEmpty()) {
                return request.copy(
                    size = request.size.coerceAtLeast(1),
                    cells = activeCells,
                )
            }

            val minRow = relevantPoints.minOf { it.first }
            val maxRow = relevantPoints.maxOf { it.first }
            val minCol = relevantPoints.minOf { it.second }
            val maxCol = relevantPoints.maxOf { it.second }
            val trimmedSize = maxOf(maxRow - minRow + 1, maxCol - minCol + 1).coerceAtLeast(1)

            return request.copy(
                size = trimmedSize,
                cells = activeCells.map { cell ->
                    cell.copy(
                        row = cell.row - minRow,
                        col = cell.col - minCol,
                        activeSquare = true,
                    )
                },
                outputFlags = request.outputFlags.map { flag ->
                    flag.copy(
                        row = flag.row - minRow,
                        col = flag.col - minCol,
                    )
                },
            )
        }
    }
}
