package com.queens.admin.domain.service

import java.security.MessageDigest
import org.springframework.stereotype.Service

@Service
class StitchingFingerprintService {
    fun validateSignature(signature: List<Int>, boardSize: Int, label: String) {
        require(signature.size == boardSize) { "$label blackout signature must match board size." }
        require(signature.all { it in 0..boardSize }) {
            "$label blackout signature contains invalid prefix values."
        }
    }

    fun canonicalSignature(signature: List<Int>): List<Int> {
        val trimmed = signature.toMutableList()
        while (trimmed.isNotEmpty() && trimmed.last() == 0) {
            trimmed.removeLast()
        }
        return trimmed.toList()
    }

    fun serializeSignature(signature: List<Int>): String = signature.joinToString(",")

    fun deserializeSignature(serialized: String, boardSize: Int): List<Int> {
        if (serialized.isBlank()) return List(boardSize) { 0 }
        val parsed = serialized.split(",").map { token -> token.trim().toInt() }
        validateSignature(parsed, boardSize, "Serialized")
        return parsed
    }

    fun fingerprintForSignature(signature: List<Int>): String {
        val canonical = canonicalSignature(signature)
        if (canonical.isEmpty()) return ""
        val digest = MessageDigest.getInstance("SHA-1").digest(serializeSignature(canonical).toByteArray())
        return digest.joinToString("") { byte -> "%02x".format(byte) }
    }

    fun categoryFor(leftFingerprint: String, topFingerprint: String): String =
        when {
            leftFingerprint.isNotBlank() && topFingerprint.isNotBlank() -> "BOTH"
            leftFingerprint.isNotBlank() -> "LEFT_ONLY"
            topFingerprint.isNotBlank() -> "TOP_ONLY"
            else -> "STANDARD"
        }

    fun fingerprintKey(leftFingerprint: String, topFingerprint: String): String = "$leftFingerprint:$topFingerprint"
}
