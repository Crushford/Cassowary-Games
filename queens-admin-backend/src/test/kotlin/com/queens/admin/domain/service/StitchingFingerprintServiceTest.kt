package com.queens.admin.domain.service

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

class StitchingFingerprintServiceTest {
    private val service = StitchingFingerprintService()

    @Test
    fun `fingerprint serializes raw row and column prefixes`() {
        assertEquals("R0130405", service.rowFingerprintForSignature(listOf(0, 1, 3, 0, 4, 0, 5)))
        assertEquals("C0040103", service.columnFingerprintForSignature(listOf(0, 0, 4, 0, 1, 0, 3)))
        assertEquals(
            "R0130405C0040103",
            service.fingerprintKey(
                listOf(0, 1, 3, 0, 4, 0, 5),
                listOf(0, 0, 4, 0, 1, 0, 3),
            ),
        )
    }

    @Test
    fun `category reflects which blackout edges are present`() {
        assertEquals("STANDARD", service.categoryFor(List(7) { 0 }, List(7) { 0 }))
        assertEquals("LEFT_ONLY", service.categoryFor(listOf(1, 0, 0, 0, 0, 0, 0), List(7) { 0 }))
        assertEquals("TOP_ONLY", service.categoryFor(List(7) { 0 }, listOf(0, 0, 0, 2, 0, 0, 0)))
        assertEquals("BOTH", service.categoryFor(listOf(1, 0, 0, 0, 0, 0, 0), listOf(0, 0, 0, 2, 0, 0, 0)))
    }

    @Test
    fun `validateSignature rejects out of range entries`() {
        assertThrows(IllegalArgumentException::class.java) {
            service.validateSignature(listOf(0, 1, 8, 0, 0, 0, 0), 7, "Left")
        }
    }
}
