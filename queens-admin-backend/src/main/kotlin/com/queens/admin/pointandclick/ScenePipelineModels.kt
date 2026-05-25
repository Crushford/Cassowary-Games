package com.queens.admin.pointandclick

import java.time.Instant

data class SceneCharacter(
    val id: String,
    val displayName: String,
    val description: String,
)

data class SceneInteractable(
    val id: String,
    val displayName: String,
    val description: String,
)

data class SceneDialogueLine(
    val id: String,
    val speakerId: String?,
    val text: String,
)

data class ScenePlayerAction(
    val id: String,
    val interactableId: String?,
    val description: String,
)

data class SceneManifest(
    val id: String,
    val title: String,
    val location: String,
    val mood: String,
    val timeOfDay: String,
    val summary: String,
    val purpose: String,
    val visualBrief: String,
    val backgroundDescription: String,
    val characters: List<SceneCharacter>,
    val interactables: List<SceneInteractable>,
    val dialogueLines: List<SceneDialogueLine>,
    val playerActions: List<ScenePlayerAction>,
    val imageGenerationNotes: String,
    val implementationNotes: String,
)

data class ParseIssue(
    val code: String,
    val message: String,
)

data class SceneParseResult(
    val manifest: SceneManifest?,
    val errors: List<ParseIssue>,
    val warnings: List<ParseIssue>,
)

data class SceneValidationResponse(
    val valid: Boolean,
    val errors: List<ParseIssue>,
    val warnings: List<ParseIssue>,
    val parsedManifest: SceneManifest?,
)

enum class AssetKind {
    BACKGROUND,
    CHARACTER,
    OBJECT,
}

data class AssetCandidate(
    val id: String,
    val sceneId: String,
    val kind: AssetKind,
    val targetId: String?,
    val title: String,
    val prompt: String,
    val revisedPrompt: String? = null,
    val imageUrl: String? = null,
    val imageData: String? = null,
    val createdAt: Instant,
    val model: String,
    val status: String,
    val selected: Boolean = false,
)

data class PromptRequest(
    val id: String,
    val sceneId: String,
    val kind: AssetKind,
    val targetId: String?,
    val title: String,
    val prompt: String,
    val sourceSummary: String,
    val negativePrompt: String,
)

data class SceneSource(
    val id: String,
    val name: String,
    val source: String,
)

data class LayerEntry(
    val entityId: String,
    val label: String,
    val kind: AssetKind,
    val x: Double,
    val y: Double,
    val width: Double,
    val height: Double,
    val zIndex: Int,
)

data class SceneLayout(
    val sceneId: String,
    val layers: List<LayerEntry>,
)

data class RuntimeSceneJson(
    val sceneId: String,
    val title: String,
    val background: AssetCandidate,
    val assets: List<AssetCandidate>,
    val layout: SceneLayout,
    val interactables: List<SceneInteractable>,
    val dialogue: List<SceneDialogueLine>,
    val initialState: Map<String, Any>,
    val metadata: Map<String, String>,
)

data class SceneExportResponse(
    val valid: Boolean,
    val errors: List<ParseIssue>,
    val runtimeScene: RuntimeSceneJson?,
)

enum class GenerationJobStatus {
    PENDING,
    RUNNING,
    COMPLETE,
    FAILED,
}

data class GenerationJob(
    val jobId: String,
    val sceneId: String,
    val kind: AssetKind,
    val status: GenerationJobStatus,
    val createdAt: Instant,
    val updatedAt: Instant,
    val candidates: List<AssetCandidate>? = null,
    val error: String? = null,
)
