package com.queens.admin.api.dto

data class SystemLoadDto(
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
    val sampledAt: String,
)
