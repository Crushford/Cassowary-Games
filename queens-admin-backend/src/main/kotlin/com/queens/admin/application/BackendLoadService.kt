package com.queens.admin.application

import com.sun.management.OperatingSystemMXBean
import java.lang.management.ManagementFactory
import java.time.Instant
import org.springframework.stereotype.Service

data class SystemLoadSnapshot(
    val processCpuPercent: Double?,
    val systemCpuPercent: Double?,
    val systemLoadAverage: Double?,
    val availableProcessors: Int,
    val heapUsedMb: Long,
    val heapMaxMb: Long,
    val singleJobsRunning: Int,
    val singleJobsQueued: Int,
    val batchRunsActive: Int,
    val batchRunsQueued: Int,
    val runningBatchCount: Int,
    val sampledAt: Instant,
)

@Service
class BackendLoadService(
    private val generationJobService: GenerationJobService,
    private val batchGenerationService: BatchGenerationService,
) {
    fun snapshot(): SystemLoadSnapshot {
        val runtime = Runtime.getRuntime()
        val heapUsedMb = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024)
        val heapMaxMb = runtime.maxMemory() / (1024 * 1024)
        val osBean = ManagementFactory.getOperatingSystemMXBean()
        val extendedBean = osBean as? OperatingSystemMXBean

        return SystemLoadSnapshot(
            processCpuPercent = extendedBean?.processCpuLoad?.takeIf { it >= 0.0 }?.times(100.0),
            systemCpuPercent = extendedBean?.cpuLoad?.takeIf { it >= 0.0 }?.times(100.0),
            systemLoadAverage = osBean.systemLoadAverage.takeIf { it >= 0.0 },
            availableProcessors = runtime.availableProcessors(),
            heapUsedMb = heapUsedMb,
            heapMaxMb = heapMaxMb,
            singleJobsRunning = generationJobService.getRunningJobCount(),
            singleJobsQueued = generationJobService.getQueuedJobCount(),
            batchRunsActive = batchGenerationService.getActiveRunCount(),
            batchRunsQueued = batchGenerationService.getQueuedRunCount(),
            runningBatchCount = batchGenerationService.getRunningBatchCount(),
            sampledAt = Instant.now(),
        )
    }
}
