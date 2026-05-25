package com.queens.admin.pointandclick

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/pointandclick")
class ScenePipelineController(
    private val scenePipelineService: ScenePipelineService,
) {
    @GetMapping("/config")
    fun getConfig(): Map<String, Any> = scenePipelineService.config()

    @GetMapping("/jobs/{jobId}")
    fun getJob(@PathVariable jobId: String): GenerationJob = scenePipelineService.getJob(jobId)

    @GetMapping("/scenes")
    fun listScenes(): List<SceneSource> = scenePipelineService.listScenes()

    @GetMapping("/scenes/{sceneId}")
    fun getScene(@PathVariable sceneId: String): SceneManifest = scenePipelineService.manifest(sceneId)

    @GetMapping("/scenes/{sceneId}/source")
    fun getSource(@PathVariable sceneId: String): Map<String, String> = mapOf("sceneId" to sceneId, "markdown" to scenePipelineService.loadSceneMarkdown(sceneId))

    @GetMapping("/scenes/{sceneId}/manifest")
    fun getManifest(@PathVariable sceneId: String): SceneManifest = scenePipelineService.manifest(sceneId)

    @PostMapping("/scenes/{sceneId}/validate")
    fun validate(@PathVariable sceneId: String): SceneValidationResponse = scenePipelineService.validate(sceneId)

    @PostMapping("/scenes/{sceneId}/prompts/backgrounds")
    fun promptsBackground(@PathVariable sceneId: String): List<PromptRequest> = scenePipelineService.prompts(sceneId, AssetKind.BACKGROUND)

    @PostMapping("/scenes/{sceneId}/prompts/characters")
    fun promptsCharacters(@PathVariable sceneId: String): List<PromptRequest> = scenePipelineService.prompts(sceneId, AssetKind.CHARACTER)

    @PostMapping("/scenes/{sceneId}/prompts/objects")
    fun promptsObjects(@PathVariable sceneId: String): List<PromptRequest> = scenePipelineService.prompts(sceneId, AssetKind.OBJECT)

    @PostMapping("/scenes/{sceneId}/generate/backgrounds")
    fun generateBackgrounds(@PathVariable sceneId: String): Map<String, String> {
        val job = scenePipelineService.startGeneration(sceneId, AssetKind.BACKGROUND)
        return mapOf("jobId" to job.jobId)
    }

    @PostMapping("/scenes/{sceneId}/generate/characters")
    fun generateCharacters(@PathVariable sceneId: String): Map<String, String> {
        val job = scenePipelineService.startGeneration(sceneId, AssetKind.CHARACTER)
        return mapOf("jobId" to job.jobId)
    }

    @PostMapping("/scenes/{sceneId}/generate/objects")
    fun generateObjects(@PathVariable sceneId: String): Map<String, String> {
        val job = scenePipelineService.startGeneration(sceneId, AssetKind.OBJECT)
        return mapOf("jobId" to job.jobId)
    }

    @GetMapping("/scenes/{sceneId}/candidates")
    fun getCandidates(@PathVariable sceneId: String): List<AssetCandidate> = scenePipelineService.getCandidates(sceneId)

    @PutMapping("/scenes/{sceneId}/candidates/{candidateId}/select")
    fun selectCandidate(@PathVariable sceneId: String, @PathVariable candidateId: String): ResponseEntity<Void> {
        scenePipelineService.selectCandidate(sceneId, candidateId)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/scenes/{sceneId}/layout")
    fun getLayout(@PathVariable sceneId: String): SceneLayout = scenePipelineService.getLayout(sceneId)

    @PutMapping("/scenes/{sceneId}/layout")
    fun putLayout(@PathVariable sceneId: String, @RequestBody layout: SceneLayout): SceneLayout = scenePipelineService.putLayout(sceneId, layout)

    @PostMapping("/scenes/{sceneId}/export")
    fun exportScene(
        @PathVariable sceneId: String,
        @RequestBody(required = false) request: ExportRequest?,
    ): SceneExportResponse = scenePipelineService.export(sceneId, request?.selectedAssets, request?.layout)
}

data class ExportRequest(
    val selectedAssets: Map<String, AssetCandidate>? = null,
    val layout: SceneLayout? = null,
)
