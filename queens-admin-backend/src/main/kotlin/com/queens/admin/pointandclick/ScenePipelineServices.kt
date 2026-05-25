package com.queens.admin.pointandclick

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.beans.factory.annotation.Value
import org.springframework.core.io.ClassPathResource
import org.springframework.stereotype.Service
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.file.Files
import java.nio.file.Path
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Service
class SceneSourceService(
    @Value("\${CASSOWARY_LORE_PATH:../vendor/cassowary-world-lore}") private val lorePath: String,
) {
    fun listScenes(): List<SceneSource> {
        val loreScenes = loadFromLorePath()
        if (loreScenes.isNotEmpty()) return loreScenes
        return listOf(
            SceneSource(id = "valid-workshop-scene", name = "Valid Workshop Scene", source = "classpath"),
            SceneSource(id = "invalid-workshop-scene", name = "Invalid Workshop Scene", source = "classpath"),
        )
    }

    fun loadSceneMarkdown(sceneId: String): String {
        val loreFile = Path.of(lorePath, "scenes", "$sceneId.md")
        if (Files.exists(loreFile)) return Files.readString(loreFile)
        val resource = ClassPathResource("pointandclick/scenes/$sceneId.md")
        require(resource.exists()) { "Scene '$sceneId' not found in lore path or sample resources." }
        return resource.inputStream.bufferedReader().readText()
    }

    fun lorePathAvailable(): Boolean {
        val scenesDir = Path.of(lorePath, "scenes")
        return Files.exists(scenesDir) && Files.isDirectory(scenesDir)
    }

    private fun loadFromLorePath(): List<SceneSource> {
        val scenesDir = Path.of(lorePath, "scenes")
        if (!Files.exists(scenesDir) || !Files.isDirectory(scenesDir)) return emptyList()
        return Files.list(scenesDir)
            .filter { it.fileName.toString().endsWith(".md") }
            .map {
                SceneSource(
                    id = it.fileName.toString().removeSuffix(".md"),
                    name = it.fileName.toString().removeSuffix(".md").replace('-', ' '),
                    source = "lore",
                )
            }
            .sorted(compareBy { it.id })
            .toList()
    }
}

@Service
class SceneManifestValidationService {
    fun validate(sceneId: String, parseResult: SceneParseResult): SceneValidationResponse {
        val errors = parseResult.errors.toMutableList()
        val warnings = parseResult.warnings.toMutableList()
        val manifest = parseResult.manifest

        if (manifest == null) {
            return SceneValidationResponse(valid = false, errors = errors, warnings = warnings, parsedManifest = null)
        }

        if (sceneId.isBlank()) errors += ParseIssue("SCENE_ID_MISSING", "sceneId is required.")
        if (manifest.title.isBlank()) errors += ParseIssue("TITLE_MISSING", "title is required.")
        if (manifest.backgroundDescription.isBlank()) errors += ParseIssue("BACKGROUND_MISSING", "background description is required.")

        manifest.characters.forEach { character ->
            if (character.id.isBlank()) errors += ParseIssue("CHARACTER_ID_MISSING", "Character id is required.")
            if (character.displayName.isBlank()) errors += ParseIssue("CHARACTER_NAME_MISSING", "Character displayName is required.")
        }

        manifest.interactables.forEach { interactable ->
            if (interactable.id.isBlank()) errors += ParseIssue("INTERACTABLE_ID_MISSING", "Interactable id is required.")
            if (interactable.description.isBlank()) warnings += ParseIssue("INTERACTABLE_DESCRIPTION_MISSING", "Interactable '${interactable.id}' should have description.")
        }

        val characterIds = manifest.characters.map { it.id }.toSet()
        manifest.dialogueLines.forEach { line ->
            val speakerId = line.speakerId
            if (speakerId != null && speakerId !in characterIds) {
                errors += ParseIssue("DIALOGUE_UNKNOWN_SPEAKER", "Dialogue '${line.id}' references unknown character '$speakerId'.")
            }
        }

        val interactableIds = manifest.interactables.map { it.id }.toSet()
        manifest.playerActions.forEach { action ->
            val ref = action.interactableId
            if (ref != null && ref !in interactableIds) {
                errors += ParseIssue("ACTION_UNKNOWN_INTERACTABLE", "Action '${action.id}' references unknown interactable '$ref'.")
            }
        }

        if (manifest.visualBrief.isBlank() || manifest.backgroundDescription.isBlank()) {
            errors += ParseIssue("PROMPT_SOURCE_INSUFFICIENT", "Prompt generation requires visual brief and background description.")
        }

        return SceneValidationResponse(valid = errors.isEmpty(), errors = errors, warnings = warnings, parsedManifest = manifest)
    }
}

@Service
class ScenePromptBuilderService {
    private val sharedAvoidances = "no text overlays, no UI, no watermark, no logos"

    fun buildBackgroundPrompts(manifest: SceneManifest): List<PromptRequest> =
        listOf(
            PromptRequest(
                id = "${manifest.id}-background-main",
                sceneId = manifest.id,
                kind = AssetKind.BACKGROUND,
                targetId = "background-main",
                title = "${manifest.title} background",
                prompt = """Hand-painted point-and-click background.
Location: ${manifest.location}
Mood: ${manifest.mood}
Time of day: ${manifest.timeOfDay}
Visual brief: ${manifest.visualBrief}
Background: ${manifest.backgroundDescription}
Purpose: ${manifest.purpose}
Notes: ${manifest.imageGenerationNotes}""".trimIndent(),
                sourceSummary = "${manifest.location} | ${manifest.mood} | ${manifest.timeOfDay}",
                negativePrompt = sharedAvoidances,
            ),
        )

    fun buildCharacterPrompts(manifest: SceneManifest): List<PromptRequest> =
        manifest.characters.map { character ->
            PromptRequest(
                id = "${manifest.id}-character-${character.id}",
                sceneId = manifest.id,
                kind = AssetKind.CHARACTER,
                targetId = character.id,
                title = "${character.displayName} character",
                prompt = "Point-and-click character concept: ${character.displayName}. Description: ${character.description}. Scene mood: ${manifest.mood}.",
                sourceSummary = "${character.displayName} in ${manifest.location}",
                negativePrompt = sharedAvoidances,
            )
        }

    fun buildObjectPrompts(manifest: SceneManifest): List<PromptRequest> =
        manifest.interactables.map { item ->
            PromptRequest(
                id = "${manifest.id}-object-${item.id}",
                sceneId = manifest.id,
                kind = AssetKind.OBJECT,
                targetId = item.id,
                title = "${item.displayName} object",
                prompt = "Isolated object concept for point-and-click: ${item.displayName}. Description: ${item.description}. Match ${manifest.mood} mood.",
                sourceSummary = "${item.displayName} from ${manifest.title}",
                negativePrompt = sharedAvoidances,
            )
        }
}

@Service
class SceneAssetGenerationService(
    private val objectMapper: ObjectMapper,
    @Value("\${POINTANDCLICK_IMAGE_GENERATION_MODE:mock}") private val generationMode: String,
    @Value("\${OPENAI_API_KEY:}") private val openAiApiKey: String,
    @Value("\${POINTANDCLICK_OPENAI_IMAGE_MODEL:gpt-image-1}") private val imageModel: String,
) {
    fun generationMode(): String = generationMode.lowercase()

    fun imageModel(): String = imageModel

    fun openAiConfigured(): Boolean = openAiApiKey.isNotBlank()

    fun generate(prompts: List<PromptRequest>): List<AssetCandidate> {
        return when (generationMode.lowercase()) {
            "openai" -> generateWithOpenAi(prompts)
            else -> generateMock(prompts)
        }
    }

    private fun generateMock(prompts: List<PromptRequest>): List<AssetCandidate> =
        prompts.map { req ->
            AssetCandidate(
                id = "mock-${req.id}",
                sceneId = req.sceneId,
                kind = req.kind,
                targetId = req.targetId,
                title = req.title,
                prompt = req.prompt,
                revisedPrompt = "Mock revised prompt for ${req.id}",
                imageUrl = "https://placehold.co/1024x1024/png?text=${req.kind.name}+${req.targetId ?: "main"}",
                createdAt = Instant.now(),
                model = "mock-v1",
                status = "ready",
            )
        }

    private fun generateWithOpenAi(prompts: List<PromptRequest>): List<AssetCandidate> {
        if (openAiApiKey.isBlank()) {
            throw IllegalStateException("OpenAI image generation is not configured. Set OPENAI_API_KEY or use POINTANDCLICK_IMAGE_GENERATION_MODE=mock.")
        }

        val client = HttpClient.newHttpClient()
        return prompts.map { req ->
            val payload = mapOf("model" to imageModel, "prompt" to req.prompt, "size" to "1024x1024")
            val requestBody = objectMapper.writeValueAsString(payload)
            val request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/images/generations"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer $openAiApiKey")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build()
            val response = client.send(request, HttpResponse.BodyHandlers.ofString())
            require(response.statusCode() in 200..299) {
                "OpenAI image generation failed with status ${response.statusCode()}."
            }
            val json = objectMapper.readTree(response.body())
            val dataArray = json.path("data")
            val firstData: JsonNode = if (dataArray.isArray && dataArray.size() > 0) dataArray[0] else objectMapper.createObjectNode()
            val base64 = firstData.path("b64_json").asText(null)
            val revisedPrompt = json.path("revised_prompt").asText(null) ?: firstData.path("revised_prompt").asText(null)
            AssetCandidate(
                id = UUID.randomUUID().toString(),
                sceneId = req.sceneId,
                kind = req.kind,
                targetId = req.targetId,
                title = req.title,
                prompt = req.prompt,
                revisedPrompt = revisedPrompt,
                imageData = base64?.let { "data:image/png;base64,$it" },
                imageUrl = firstData.path("url").asText(null),
                createdAt = Instant.now(),
                model = imageModel,
                status = "ready",
            )
        }
    }
}

@Service
class SceneStateService {
    private val candidatesByScene = ConcurrentHashMap<String, MutableList<AssetCandidate>>()
    private val layoutByScene = ConcurrentHashMap<String, SceneLayout>()
    private val jobs = ConcurrentHashMap<String, GenerationJob>()

    fun getCandidates(sceneId: String): List<AssetCandidate> = candidatesByScene[sceneId]?.toList() ?: emptyList()

    fun upsertCandidates(sceneId: String, incoming: List<AssetCandidate>) {
        val current = candidatesByScene.computeIfAbsent(sceneId) { mutableListOf() }
        current.addAll(incoming)
    }

    fun selectCandidate(sceneId: String, candidateId: String) {
        val current = candidatesByScene[sceneId] ?: return
        val selected = current.find { it.id == candidateId } ?: return
        val next = current.map { candidate ->
            if (candidate.kind == selected.kind) candidate.copy(selected = candidate.id == candidateId) else candidate
        }
        candidatesByScene[sceneId] = next.toMutableList()
    }

    fun getLayout(sceneId: String): SceneLayout = layoutByScene[sceneId] ?: SceneLayout(sceneId = sceneId, layers = emptyList())

    fun putLayout(sceneId: String, layout: SceneLayout): SceneLayout {
        val fixed = layout.copy(sceneId = sceneId)
        layoutByScene[sceneId] = fixed
        return fixed
    }

    fun createJob(sceneId: String, kind: AssetKind): GenerationJob {
        val now = Instant.now()
        val job = GenerationJob(jobId = UUID.randomUUID().toString(), sceneId = sceneId, kind = kind, status = GenerationJobStatus.PENDING, createdAt = now, updatedAt = now)
        jobs[job.jobId] = job
        return job
    }

    fun updateJob(job: GenerationJob) {
        jobs[job.jobId] = job.copy(updatedAt = Instant.now())
    }

    fun getJob(jobId: String): GenerationJob? = jobs[jobId]
}

@Service
class ScenePipelineService(
    private val sceneSourceService: SceneSourceService,
    private val parser: SceneMarkdownParser,
    private val validationService: SceneManifestValidationService,
    private val promptBuilder: ScenePromptBuilderService,
    private val assetGenerationService: SceneAssetGenerationService,
    private val sceneStateService: SceneStateService,
) {
    fun listScenes(): List<SceneSource> = sceneSourceService.listScenes()

    fun loadSceneMarkdown(sceneId: String): String = sceneSourceService.loadSceneMarkdown(sceneId)

    fun manifest(sceneId: String): SceneManifest {
        val parsed = parser.parse(sceneId, sceneSourceService.loadSceneMarkdown(sceneId))
        return parsed.manifest ?: throw IllegalArgumentException(parsed.errors.joinToString("; ") { it.message })
    }

    fun validate(sceneId: String): SceneValidationResponse {
        return runCatching {
            val markdown = sceneSourceService.loadSceneMarkdown(sceneId)
            val parsed = parser.parse(sceneId, markdown)
            validationService.validate(sceneId, parsed)
        }.getOrElse {
            SceneValidationResponse(valid = false, errors = listOf(ParseIssue("SCENE_NOT_FOUND", "Scene '$sceneId' does not exist.")), warnings = emptyList(), parsedManifest = null)
        }
    }

    fun config(): Map<String, Any> =
        mapOf(
            "generationMode" to assetGenerationService.generationMode(),
            "imageModel" to assetGenerationService.imageModel(),
            "openAiConfigured" to assetGenerationService.openAiConfigured(),
            "lorePathAvailable" to sceneSourceService.lorePathAvailable(),
        )

    fun prompts(sceneId: String, kind: AssetKind): List<PromptRequest> {
        val validation = validate(sceneId)
        if (!validation.valid || validation.parsedManifest == null) {
            throw IllegalArgumentException("Cannot build prompts for invalid scene '$sceneId'.")
        }
        return when (kind) {
            AssetKind.BACKGROUND -> promptBuilder.buildBackgroundPrompts(validation.parsedManifest)
            AssetKind.CHARACTER -> promptBuilder.buildCharacterPrompts(validation.parsedManifest)
            AssetKind.OBJECT -> promptBuilder.buildObjectPrompts(validation.parsedManifest)
        }
    }

    fun startGeneration(sceneId: String, kind: AssetKind): GenerationJob {
        val created = sceneStateService.createJob(sceneId, kind)
        Thread {
            sceneStateService.updateJob(created.copy(status = GenerationJobStatus.RUNNING))
            try {
                val candidates = assetGenerationService.generate(prompts(sceneId, kind))
                sceneStateService.upsertCandidates(sceneId, candidates)
                sceneStateService.updateJob(created.copy(status = GenerationJobStatus.COMPLETE, candidates = candidates))
            } catch (ex: Exception) {
                sceneStateService.updateJob(created.copy(status = GenerationJobStatus.FAILED, error = ex.message ?: "Generation failed"))
            }
        }.start()
        return created
    }

    fun getJob(jobId: String): GenerationJob = sceneStateService.getJob(jobId) ?: throw IllegalArgumentException("Unknown jobId '$jobId'")

    fun getCandidates(sceneId: String): List<AssetCandidate> = sceneStateService.getCandidates(sceneId)

    fun selectCandidate(sceneId: String, candidateId: String) {
        sceneStateService.selectCandidate(sceneId, candidateId)
    }

    fun getLayout(sceneId: String): SceneLayout = sceneStateService.getLayout(sceneId)

    fun putLayout(sceneId: String, layout: SceneLayout): SceneLayout = sceneStateService.putLayout(sceneId, layout)

    fun export(sceneId: String, selectedAssets: Map<String, AssetCandidate>?, layout: SceneLayout?): SceneExportResponse {
        val validation = validate(sceneId)
        val manifest = validation.parsedManifest
        if (!validation.valid || manifest == null) {
            return SceneExportResponse(valid = false, errors = validation.errors, runtimeScene = null)
        }

        val persistedSelected = getCandidates(sceneId).filter { it.selected }.associateBy { it.kind.name.lowercase() }
        val effectiveSelected = selectedAssets ?: persistedSelected

        val background = effectiveSelected["background"]
        if (background == null) {
            return SceneExportResponse(
                valid = false,
                errors = listOf(ParseIssue("BACKGROUND_NOT_SELECTED", "A selected background asset is required for export.")),
                runtimeScene = null,
            )
        }

        val effectiveLayout = layout ?: getLayout(sceneId)
        val assets = effectiveSelected.values.toList()
        val runtime = RuntimeSceneJson(
            sceneId = manifest.id,
            title = manifest.title,
            background = background,
            assets = assets,
            layout = effectiveLayout,
            interactables = manifest.interactables,
            dialogue = manifest.dialogueLines,
            initialState = mapOf("flags" to emptyMap<String, Boolean>(), "inventory" to emptyList<String>()),
            metadata = mapOf("sourceSceneId" to manifest.id, "pipelineVersion" to "v1", "manifestTitle" to manifest.title),
        )
        return SceneExportResponse(valid = true, errors = emptyList(), runtimeScene = runtime)
    }
}
