package com.queens.admin.application

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SharedQueensSolverConfigServiceTest {
    private val service = SharedQueensSolverConfigService(jacksonObjectMapper().findAndRegisterModules())

    @Test
    fun `loads shared solver config with expected built in ladder`() {
        val config = service.load()

        assertEquals(
            listOf("tutorial", "extra-easy", "easy", "medium", "hard", "extra-hard", "unsolvable"),
            config.difficultyOrder,
        )
        assertEquals("single-color", config.builtInSteps.first().id)
        assertTrue(config.patterns.any { pattern -> pattern.id == "pc-1" })
        assertTrue(config.patterns.any { pattern -> pattern.id == "pc-2" })
    }

    @Test
    fun `built in steps keep the intended hint order`() {
        val config = service.load()

        assertEquals(
            listOf(
                "single-color",
                "group-confined-to-line",
                "row-column",
                "single-queen-contradiction",
                "row-column-sets",
                "assume-progress",
                "assume-exhaustive",
            ),
            config.builtInSteps.sortedBy { it.sortOrder }.map { it.id },
        )
    }
}
