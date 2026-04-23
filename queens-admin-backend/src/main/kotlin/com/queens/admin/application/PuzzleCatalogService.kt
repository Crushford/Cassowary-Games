package com.queens.admin.application

import com.queens.admin.domain.model.BoardState
import com.queens.admin.domain.model.PersistedPuzzle
import com.queens.admin.domain.model.PuzzleDifficultyTier
import com.queens.admin.domain.model.QueensBoardMetadata
import com.queens.admin.domain.service.CanonicalPuzzleSignatureService
import kotlin.random.Random
import com.queens.admin.infrastructure.persistence.PuzzleRepository
import java.time.Instant
import java.util.UUID
import org.springframework.stereotype.Service

@Service
class PuzzleCatalogService(
    private val puzzleRepository: PuzzleRepository,
    private val canonicalPuzzleSignatureService: CanonicalPuzzleSignatureService,
    private val puzzleDifficultyAssessmentService: PuzzleDifficultyAssessmentService,
) {
    data class SaveGeneratedPuzzleResult(
        val state: String,
        val puzzle: PersistedPuzzle?,
    )

    fun findByCanonicalSignature(canonicalSignature: String): PersistedPuzzle? =
        puzzleRepository.findByCanonicalSignature(canonicalSignature)

    fun findById(id: UUID): PersistedPuzzle? =
        puzzleRepository.findById(id)

    fun findAll(): List<PersistedPuzzle> =
        puzzleRepository.findAll()

    fun findRandomFiltered(
        size: Int? = null,
        orthogonalMinDistance: Int? = null,
        targetQueenCount: Int? = null,
        minimumGroupSize: Int? = null,
        pieceKind: String? = null,
        leftBlackoutSignature: String? = null,
        topBlackoutSignature: String? = null,
        difficultyTier: PuzzleDifficultyTier? = null,
    ): PersistedPuzzle? {
        val puzzles =
            puzzleRepository.findAllFiltered(
                size = size,
                orthogonalMinDistance = orthogonalMinDistance,
                targetQueenCount = targetQueenCount,
                minimumGroupSize = minimumGroupSize,
                pieceKind = pieceKind,
                leftBlackoutSignature = leftBlackoutSignature,
                topBlackoutSignature = topBlackoutSignature,
                difficultyTier = difficultyTier,
            )
        if (puzzles.isEmpty()) return null
        return puzzles[Random.nextInt(puzzles.size)]
    }

    fun countBySize(): Map<Int, Int> =
        puzzleRepository.countBySize()

    fun countBySizeAndDistance(): Map<Pair<Int, Int>, Int> =
        puzzleRepository.countBySizeAndDistance()

    fun countByGenerationBucket(): List<PuzzleRepository.PuzzleGenerationBucketCount> =
        puzzleRepository.countByGenerationBucket()

    fun countByRulesetGroup(): List<PuzzleRepository.PuzzleCatalogGroupCount> =
        puzzleRepository.countByRulesetGroup()

    fun deleteByRulesetGroup(
        size: Int,
        orthogonalMinDistance: Int,
        targetQueenCount: Int,
        minimumGroupSize: Int,
        difficultyTier: PuzzleDifficultyTier? = null,
    ): Int =
        puzzleRepository.deleteByRulesetGroup(
            size = size,
            orthogonalMinDistance = orthogonalMinDistance,
            targetQueenCount = targetQueenCount,
            minimumGroupSize = minimumGroupSize,
            difficultyTier = difficultyTier,
        )

    fun save(persistedPuzzle: PersistedPuzzle): PersistedPuzzle =
        puzzleRepository.insert(persistedPuzzle)

    fun assessGeneratedPuzzle(
        boardState: BoardState,
        minimumGroupSize: Int,
        generationStrategy: String,
    ): PuzzleDifficultyAssessmentService.AssessmentResult =
        puzzleDifficultyAssessmentService.assess(
            buildGeneratedPersistedPuzzle(
                boardState = boardState,
                minimumGroupSize = minimumGroupSize,
                generationStrategy = generationStrategy,
            ),
        )

    fun saveGeneratedPuzzleIfUnique(
        boardState: BoardState,
        minimumGroupSize: Int,
        generationStrategy: String,
        pieceKind: String = "STANDARD",
        leftBlackoutSignature: String = "",
        topBlackoutSignature: String = "",
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

        val persistedPuzzle = buildGeneratedPersistedPuzzle(
            boardState = boardState,
            minimumGroupSize = minimumGroupSize,
            generationStrategy = generationStrategy,
            pieceKind = pieceKind,
            leftBlackoutSignature = leftBlackoutSignature,
            topBlackoutSignature = topBlackoutSignature,
            canonicalSignature = canonicalSignature,
        )
        val assessment = puzzleDifficultyAssessmentService.assess(persistedPuzzle)
        if (assessment.difficultyTier == PuzzleDifficultyTier.UNSOLVABLE) {
            return SaveGeneratedPuzzleResult(
                state = "UNSOLVABLE",
                puzzle = null,
            )
        }
        val assessedPuzzle = persistedPuzzle.copy(
            difficultyTier = assessment.difficultyTier,
            difficultyScore = assessment.difficultyScore,
            difficultySolverVersion = PuzzleDifficultyAssessmentService.SOLVER_VERSION,
            difficultyAssessedAt = Instant.now(),
        )

        return try {
            SaveGeneratedPuzzleResult(
                state = "SAVED",
                puzzle = save(assessedPuzzle),
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

    private fun buildGeneratedPersistedPuzzle(
        boardState: BoardState,
        minimumGroupSize: Int,
        generationStrategy: String,
        pieceKind: String = "STANDARD",
        leftBlackoutSignature: String = "",
        topBlackoutSignature: String = "",
        canonicalSignature: String? = null,
    ): PersistedPuzzle {
        val encodedPuzzle = canonicalPuzzleSignatureService.encodeBoardState(boardState)
        val resolvedCanonicalSignature =
            canonicalSignature ?: canonicalPuzzleSignatureService.computeSignature(
                encodedPuzzle.layout,
                encodedPuzzle.queens,
            )
        return PersistedPuzzle(
            id = UUID.randomUUID(),
            size = boardState.size,
            layout = encodedPuzzle.layout,
            queens = encodedPuzzle.queens,
            targetQueenCount = QueensBoardMetadata.targetQueenCount(boardState),
            orthogonalMinDistance = QueensBoardMetadata.orthogonalMinDistance(boardState),
            canonicalSignature = resolvedCanonicalSignature,
            minimumGroupSize = minimumGroupSize,
            generationStrategy = generationStrategy,
            pieceKind = pieceKind,
            leftBlackoutSignature = leftBlackoutSignature,
            topBlackoutSignature = topBlackoutSignature,
            createdAt = Instant.now(),
        )
    }
}
