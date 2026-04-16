package com.queens.admin.domain.service

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

class StitchingFingerprintServiceTest {
    private val service = StitchingFingerprintService()

    @Test
    fun `fingerprint trims trailing zeros so equivalent signatures match`() {
        val left = listOf(3, 1, 0, 0, 0, 0, 0)
        val right = listOf(3, 1)

        assertEquals(service.fingerprintForSignature(left), service.fingerprintForSignature(right))
    }

    @Test
    fun `category reflects which blackout edges are present`() {
        assertEquals("STANDARD", service.categoryFor("", ""))
        assertEquals("LEFT_ONLY", service.categoryFor("left", ""))
        assertEquals("TOP_ONLY", service.categoryFor("", "top"))
        assertEquals("BOTH", service.categoryFor("left", "top"))
    }

    @Test
    fun `validateSignature rejects out of range entries`() {
        assertThrows(IllegalArgumentException::class.java) {
            service.validateSignature(listOf(0, 1, 8, 0, 0, 0, 0), 7, "Left")
        }
    }
}
