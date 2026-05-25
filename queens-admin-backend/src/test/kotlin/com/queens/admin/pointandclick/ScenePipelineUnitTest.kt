package com.queens.admin.pointandclick

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ScenePipelineUnitTest {
    private val validMarkdown = """
---
title: Sample Scene
location: Dockside
mood: tense
timeOfDay: dusk
summary: Test summary.
---
## Scene Purpose
Test purpose.
## Visual Brief
Test visual.
## Background
Test background.
## Characters
- rowan | Rowan | Blacksmith mentor
- player | Player | Traveler
## Interactables
- anvil | Anvil | Heavy forge anvil
## Dialogue
- dlg-1 | rowan | Welcome to the dock forge.
## Player Actions
- act-1 | anvil | Inspect the anvil
## Asset Generation Notes
notes
## Implementation Notes
impl
""".trimIndent()

    @Test
    fun `parser parses valid markdown into manifest`() {
        val parser = SceneMarkdownParser()
        val result = parser.parse("sample", validMarkdown)
        assertTrue(result.errors.isEmpty())
        val manifest = requireNotNull(result.manifest)
        assertEquals("sample", manifest.id)
        assertEquals("Sample Scene", manifest.title)
        assertEquals("Dockside", manifest.location)
        assertEquals("Test background.", manifest.backgroundDescription)
        assertEquals("rowan", manifest.characters.first().id)
        assertEquals("anvil", manifest.interactables.first().id)
    }

    @Test
    fun `prompt builder creates deterministic prompts`() {
        val manifest = requireNotNull(SceneMarkdownParser().parse("sample", validMarkdown).manifest)
        val builder = ScenePromptBuilderService()
        val a = builder.buildBackgroundPrompts(manifest)
        val b = builder.buildBackgroundPrompts(manifest)
        assertEquals(a, b)
        assertTrue(a.first().prompt.contains("Dockside"))
    }

    @Test
    fun `mock generation works without OPENAI key`() {
        val service = SceneAssetGenerationService(
            objectMapper = jacksonObjectMapper(),
            generationMode = "mock",
            openAiApiKey = "",
            imageModel = "gpt-image-1",
        )
        val prompt = PromptRequest(
            id = "p1",
            sceneId = "s1",
            kind = AssetKind.BACKGROUND,
            targetId = "background-main",
            title = "bg",
            prompt = "p1",
            sourceSummary = "src",
            negativePrompt = "no text",
        )
        val out = service.generate(listOf(prompt)).first()
        assertEquals("s1", out.sceneId)
        assertEquals("mock-v1", out.model)
        assertTrue(out.imageUrl?.contains("placehold.co") == true)
    }

    @Test
    fun `openai mode fails clearly without OPENAI key and does not leak key`() {
        val service = SceneAssetGenerationService(
            objectMapper = jacksonObjectMapper(),
            generationMode = "openai",
            openAiApiKey = "",
            imageModel = "gpt-image-1",
        )
        val prompt = PromptRequest(
            id = "p1",
            sceneId = "s1",
            kind = AssetKind.BACKGROUND,
            targetId = "background-main",
            title = "bg",
            prompt = "p1",
            sourceSummary = "src",
            negativePrompt = "no text",
        )
        val ex = kotlin.runCatching { service.generate(listOf(prompt)) }.exceptionOrNull()
        assertNotNull(ex)
        val message = ex?.message.orEmpty()
        assertTrue(message.contains("not configured") || message.contains("mock"))
        assertFalse(message.contains("sk-"))
    }
}
