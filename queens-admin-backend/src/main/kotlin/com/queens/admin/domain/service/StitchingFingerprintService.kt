package com.queens.admin.domain.service

import org.springframework.stereotype.Service

@Service
class StitchingFingerprintService {
    fun validateSignature(signature: List<Int>, boardSize: Int, label: String) {
        require(signature.size == boardSize) { "$label blackout signature must match board size." }
        require(signature.all { it in 0..boardSize }) {
            "$label blackout signature contains invalid prefix values."
        }
    }

    fun canonicalSignature(signature: List<Int>): List<Int> = signature.toList()

    private fun serializeSignature(signature: List<Int>): String = signature.joinToString(separator = "")

    fun serializeSignatureToDb(signature: List<Int>): String = signature.joinToString(",")

    fun deserializeSignature(serialized: String, boardSize: Int): List<Int> {
        if (serialized.isBlank()) return List(boardSize) { 0 }
        val parsed = serialized.split(",").map { token -> token.trim().toInt() }
        validateSignature(parsed, boardSize, "Serialized")
        return parsed
    }

    fun rowFingerprintForSignature(signature: List<Int>): String = "R${serializeSignature(signature)}"

    fun columnFingerprintForSignature(signature: List<Int>): String = "C${serializeSignature(signature)}"

    fun fingerprintKey(leftSignature: List<Int>, topSignature: List<Int>): String =
        "${rowFingerprintForSignature(leftSignature)}${columnFingerprintForSignature(topSignature)}"

    fun combinedFingerprintKey(leftFingerprint: String, topFingerprint: String): String =
        "$leftFingerprint$topFingerprint"

    fun categoryFor(leftSignature: List<Int>, topSignature: List<Int>): String =
        when {
            leftSignature.any { it > 0 } && topSignature.any { it > 0 } -> "BOTH"
            leftSignature.any { it > 0 } -> "LEFT_ONLY"
            topSignature.any { it > 0 } -> "TOP_ONLY"
            else -> "STANDARD"
        }
}
