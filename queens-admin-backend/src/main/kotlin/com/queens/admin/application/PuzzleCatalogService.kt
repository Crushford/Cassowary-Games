package com.queens.admin.application

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.PersistedPuzzle
import com.queens.admin.domain.service.CanonicalPuzzleSignatureService
import com.queens.admin.infrastructure.persistence.PuzzleRepository
import java.time.Instant
import java.util.UUID
import org.springframework.stereotype.Service

@Service
class PuzzleCatalogService(
    private val puzzleRepository: PuzzleRepository,
    private val canonicalPuzzleSignatureService: CanonicalPuzzleSignatureService,
) {
    data class SaveGeneratedPuzzleResult(
        val state: String,
        val puzzle: PersistedPuzzle?,
    )

    fun findByCanonicalSignature(canonicalSignature: String): PersistedPuzzle? =
        puzzleRepository.findByCanonicalSignature(canonicalSignature)

    fun findAll(): List<PersistedPuzzle> =
        puzzleRepository.findAll()

    fun countBySize(): Map<Int, Int> =
        puzzleRepository.countBySize()

    fun save(persistedPuzzle: PersistedPuzzle): PersistedPuzzle =
        puzzleRepository.insert(persistedPuzzle)

    fun saveGeneratedPuzzleIfUnique(
        boardState: BoardState,
        minimumGroupSize: Int,
        generationStrategy: String,
    ): SaveGeneratedPuzzleResult {
        val encodedPuzzle = canonicalPuzzleSignatureService.encodeBoardState(boardState)
        val canonicalSignature =
            canonicalPuzzleSignatureService.computeSignature(
                encodedPuzzle.layout,
                encodedPuzzle.queens,
            )

        findByCanonicalSignature(canonicalSignature)?.let { existing ->
            return SaveGeneratedPuzzleResult(
                state = "DUPLICATE",
                puzzle = existing,
            )
        }

        val persistedPuzzle =
            PersistedPuzzle(
                id = UUID.randomUUID(),
                size = boardState.size,
                layout = encodedPuzzle.layout,
                queens = encodedPuzzle.queens,
                canonicalSignature = canonicalSignature,
                minimumGroupSize = minimumGroupSize,
                generationStrategy = generationStrategy,
                createdAt = Instant.now(),
            )

        return try {
            SaveGeneratedPuzzleResult(
                state = "SAVED",
                puzzle = save(persistedPuzzle),
            )
        } catch (error: Exception) {
            val existing = findByCanonicalSignature(canonicalSignature)
            if (existing != null) {
                SaveGeneratedPuzzleResult(
                    state = "DUPLICATE",
                    puzzle = existing,
                )
            } else {
                throw error
            }
        }
    }
}
