package com.queens.admin.pointandclick

import org.springframework.stereotype.Component

@Component
class SceneMarkdownParser {
    fun parse(sceneId: String, markdown: String): SceneParseResult {
        val errors = mutableListOf<ParseIssue>()
        val warnings = mutableListOf<ParseIssue>()

        val frontmatter = parseFrontmatter(markdown)
        val sections = parseSections(markdown)
        val requiredSections = listOf(
            "scene purpose",
            "visual brief",
            "background",
            "characters",
            "interactables",
            "dialogue",
            "player actions",
            "asset generation notes",
            "implementation notes",
        )

        requiredSections.forEach { key ->
            if (!sections.containsKey(key)) {
                errors += ParseIssue("MISSING_SECTION", "Missing required section: $key")
            }
        }

        val title = frontmatter["title"].orEmpty()
        if (title.isBlank()) {
            errors += ParseIssue("MISSING_TITLE", "Frontmatter title is required.")
        }

        val characters = parseCharacters(sections["characters"].orEmpty(), warnings)
        val interactables = parseInteractables(sections["interactables"].orEmpty(), warnings)
        val dialogue = parseDialogue(sections["dialogue"].orEmpty(), warnings)
        val actions = parseActions(sections["player actions"].orEmpty(), warnings)

        val manifest = if (errors.isEmpty()) {
            SceneManifest(
                id = sceneId,
                title = title,
                location = frontmatter["location"] ?: "unknown",
                mood = frontmatter["mood"] ?: "neutral",
                timeOfDay = frontmatter["timeOfDay"] ?: frontmatter["time_of_day"] ?: "day",
                summary = frontmatter["summary"].orEmpty(),
                purpose = sections["scene purpose"].orEmpty(),
                visualBrief = sections["visual brief"].orEmpty(),
                backgroundDescription = sections["background"].orEmpty(),
                characters = characters,
                interactables = interactables,
                dialogueLines = dialogue,
                playerActions = actions,
                imageGenerationNotes = sections["asset generation notes"].orEmpty(),
                implementationNotes = sections["implementation notes"].orEmpty(),
            )
        } else {
            null
        }

        return SceneParseResult(manifest = manifest, errors = errors, warnings = warnings)
    }

    private fun parseFrontmatter(markdown: String): Map<String, String> {
        val lines = markdown.lines()
        if (lines.firstOrNull()?.trim() != "---") return emptyMap()
        val endIndex = (1 until lines.size).firstOrNull { lines[it].trim() == "---" } ?: -1
        if (endIndex <= 0) return emptyMap()
        return lines.subList(1, endIndex)
            .mapNotNull { line ->
                val idx = line.indexOf(':')
                if (idx < 0) null else line.substring(0, idx).trim() to line.substring(idx + 1).trim()
            }
            .toMap()
    }

    private fun parseSections(markdown: String): Map<String, String> {
        val sectionRegex = Regex("(?m)^##\\s+(.+)$")
        val matches = sectionRegex.findAll(markdown).toList()
        val sections = linkedMapOf<String, String>()
        for ((index, match) in matches.withIndex()) {
            val key = normalizeSectionKey(match.groupValues[1].trim())
            val start = match.range.last + 1
            val end = if (index + 1 < matches.size) matches[index + 1].range.first else markdown.length
            sections[key] = markdown.substring(start, end).trim()
        }
        return sections
    }

    private fun normalizeSectionKey(raw: String): String {
        val lower = raw.lowercase().trim()
        return when {
            lower == "background description" -> "background"
            lower == "dialogue/script" -> "dialogue"
            else -> lower
        }
    }

    private fun parseCharacters(block: String, warnings: MutableList<ParseIssue>): List<SceneCharacter> =
        parseList(block).mapIndexed { index, item ->
            val parts = item.split("|").map { it.trim() }
            when {
                parts.size >= 3 -> SceneCharacter(parts[0], parts[1], parts.drop(2).joinToString(" | "))
                parts.size == 2 -> {
                    warnings += ParseIssue("CHARACTER_DESCRIPTION_MISSING", "Character '${parts[0]}' missing description; using fallback.")
                    SceneCharacter(parts[0], parts[1], "")
                }
                else -> {
                    warnings += ParseIssue("CHARACTER_FORMAT", "Character entry '$item' is malformed. Expected 'id | displayName | description'.")
                    SceneCharacter("character-$index", item, "")
                }
            }
        }

    private fun parseInteractables(block: String, warnings: MutableList<ParseIssue>): List<SceneInteractable> =
        parseList(block).mapIndexed { index, item ->
            val parts = item.split("|").map { it.trim() }
            when {
                parts.size >= 3 -> SceneInteractable(parts[0], parts[1], parts.drop(2).joinToString(" | "))
                parts.size == 2 -> {
                    warnings += ParseIssue("INTERACTABLE_DESCRIPTION_MISSING", "Interactable '${parts[0]}' missing description; using fallback.")
                    SceneInteractable(parts[0], parts[1], "")
                }
                else -> {
                    warnings += ParseIssue("INTERACTABLE_FORMAT", "Interactable entry '$item' is malformed. Expected 'id | displayName | description'.")
                    SceneInteractable("interactable-$index", item, "")
                }
            }
        }

    private fun parseDialogue(block: String, warnings: MutableList<ParseIssue>): List<SceneDialogueLine> =
        parseList(block).mapIndexed { index, item ->
            val parts = item.split("|", limit = 3).map { it.trim() }
            when {
                parts.size >= 3 -> SceneDialogueLine(parts[0], parts[1].ifBlank { null }, parts[2])
                parts.size == 2 -> {
                    warnings += ParseIssue("DIALOGUE_FORMAT", "Dialogue '$item' missing stable id; generated fallback id.")
                    SceneDialogueLine("dialogue-$index", parts[0].ifBlank { null }, parts[1])
                }
                else -> {
                    warnings += ParseIssue("DIALOGUE_FORMAT", "Dialogue '$item' malformed. Expected 'id | speakerId | text'.")
                    SceneDialogueLine("dialogue-$index", null, item)
                }
            }
        }

    private fun parseActions(block: String, warnings: MutableList<ParseIssue>): List<ScenePlayerAction> =
        parseList(block).mapIndexed { index, item ->
            val parts = item.split("|", limit = 3).map { it.trim() }
            when {
                parts.size >= 3 -> ScenePlayerAction(parts[0], parts[1].ifBlank { null }, parts[2])
                parts.size == 2 -> {
                    warnings += ParseIssue("ACTION_FORMAT", "Action '$item' missing stable id; generated fallback id.")
                    ScenePlayerAction("action-$index", parts[0].ifBlank { null }, parts[1])
                }
                else -> {
                    warnings += ParseIssue("ACTION_FORMAT", "Action '$item' malformed. Expected 'id | interactableId | description'.")
                    ScenePlayerAction("action-$index", null, item)
                }
            }
        }

    private fun parseList(block: String): List<String> =
        block.lines()
            .map { it.trim().removePrefix("-").trim() }
            .filter { it.isNotBlank() }
}
