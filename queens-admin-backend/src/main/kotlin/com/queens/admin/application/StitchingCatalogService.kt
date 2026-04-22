package com.queens.admin.application

import com.queens.admin.domain.model.PersistedStitchingPuzzle
import com.queens.admin.infrastructure.persistence.StitchingPuzzleRepository
import java.util.concurrent.ConcurrentHashMap
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class StitchingCatalogService(
    private val stitchingPuzzleRepository: StitchingPuzzleRepository,
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val maxQueenCountCache = ConcurrentHashMap<String, Int>()

    data class SavePieceResult(
        val state: String,
        val puzzle: PersistedStitchingPuzzle?,
        val message: String? = null,
    )

    fun savePiece(piece: PersistedStitchingPuzzle): SavePieceResult {
        stitchingPuzzleRepository.findByCanonicalSignature(piece.canonicalSignature)?.let { existing ->
            return SavePieceResult(
                state = "DUPLICATE",
                puzzle = existing,
                message = "Canonical duplicate skipped.",
            )
        }
        return try {
            SavePieceResult(
                state = "SAVED",
                puzzle = stitchingPuzzleRepository.save(piece),
                message = "Saved to stitching catalog.",
            )
        } catch (error: Exception) {
            val existing = stitchingPuzzleRepository.findByCanonicalSignature(piece.canonicalSignature)
            if (existing != null) {
                SavePieceResult(
                    state = "DUPLICATE",
                    puzzle = existing,
                    message = "Canonical duplicate skipped after concurrent insert collision.",
                )
            } else {
                throw error
            }
        }
    }

    fun getPiecesByFingerprintKey(key: String): List<PersistedStitchingPuzzle> =
        stitchingPuzzleRepository.findByFingerprintKey(key)

    fun hasAnyForFingerprintKey(key: String): Boolean =
        stitchingPuzzleRepository.existsByFingerprintKey(key)

    fun knownMaxQueenCountForFingerprintKey(key: String): Int? =
        maxQueenCountCache[key] ?: computeCanonicalQueenCountForFingerprintKey(key)?.also { resolved ->
            maxQueenCountCache[key] = resolved
        }

    private fun computeCanonicalQueenCountForFingerprintKey(key: String): Int? {
        val counts = stitchingPuzzleRepository.findDistinctQueenCountsByFingerprintKey(key)
        if (counts.isEmpty()) return null
        if (counts.size > 1) {
            logger.error(
                "Conflicting queen counts found for fingerprintKey={}: counts={}",
                key,
                counts,
            )
        }
        val canonical = counts.maxOrNull() ?: return null
        return canonical
    }

    fun findAll(): List<PersistedStitchingPuzzle> = stitchingPuzzleRepository.findAll()

    fun countByFingerprintKey(): List<StitchingPuzzleRepository.FingerprintBucketCount> =
        stitchingPuzzleRepository.countByFingerprintKey()

    fun deleteBlackoutPuzzles(): Int = stitchingPuzzleRepository.deleteBlackoutPuzzles()
}
