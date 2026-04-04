package com.queens.admin.config

import javax.sql.DataSource
import org.jetbrains.exposed.sql.Database
import org.springframework.context.annotation.Configuration
import jakarta.annotation.PostConstruct

@Configuration
class DatabaseConfig(
    private val dataSource: DataSource,
) {
    @PostConstruct
    fun connectExposed() {
        Database.connect(dataSource)
    }
}
