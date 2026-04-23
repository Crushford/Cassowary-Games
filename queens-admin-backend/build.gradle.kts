plugins {
    id("org.springframework.boot") version "3.4.4"
    id("io.spring.dependency-management") version "1.1.7"
    kotlin("jvm") version "2.1.10"
    kotlin("plugin.spring") version "2.1.10"
}

group = "com.queens"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-jdbc")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("org.jetbrains.exposed:exposed-core:0.53.0")
    implementation("org.jetbrains.exposed:exposed-jdbc:0.53.0")
    implementation("org.jetbrains.exposed:exposed-java-time:0.53.0")
    runtimeOnly("org.postgresql:postgresql")
    developmentOnly("org.springframework.boot:spring-boot-devtools")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.add("-Xjsr305=strict")
    }
}

springBoot {
    mainClass.set("com.queens.admin.QueensAdminApplicationKt")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.register<JavaExec>("importLegacyPuzzles") {
    group = "application"
    description = "Import legacy Queens puzzles JSON into PostgreSQL, keeping only canonical -0 rows."
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("com.queens.admin.tools.ImportLegacyPuzzlesKt")
}

tasks.register<JavaExec>("exportPuzzlesJson") {
    group = "application"
    description = "Export canonical Queens puzzles from PostgreSQL into frontend/public/queens/puzzles.json."
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("com.queens.admin.tools.ExportPuzzlesJsonKt")
}

tasks.register<JavaExec>("exportStitchingCatalog") {
    group = "application"
    description = "Export stitched Queens puzzles from PostgreSQL into frontend/public/queens/stitching."
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("com.queens.admin.tools.ExportStitchingCatalogKt")
}

tasks.register<JavaExec>("assessPuzzleDifficulties") {
    group = "application"
    description = "Assess and persist difficulty labels for all puzzles in PostgreSQL."
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("com.queens.admin.tools.AssessPuzzleDifficultiesKt")
}

tasks.register<JavaExec>("assessPuzzleDifficultiesOverwrite") {
    group = "application"
    description = "Reassess and persist difficulty labels for all puzzles in PostgreSQL, overwriting existing values."
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("com.queens.admin.tools.AssessPuzzleDifficultiesKt")
    systemProperty("queens.assess.overwrite", "true")
}

tasks.register<JavaExec>("exportSharedSolverConfig") {
    group = "application"
    description = "Export the shared Queens solver config artifact from the current backend/admin config."
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("com.queens.admin.tools.ExportSharedSolverConfigKt")
}

tasks.register<JavaExec>("printExportFingerprint") {
    group = "application"
    description = "Print a compact fingerprint for DB-backed Queens puzzle and solver-pattern exports."
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("com.queens.admin.tools.PrintExportFingerprintKt")
}
