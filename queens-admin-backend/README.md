# Queens Admin Backend

Spring Boot service for the Queens admin workshop.

## Stack

- Kotlin
- Spring Boot
- Spring Web
- Jackson
- Gradle Kotlin DSL

## Current slice

Implemented:

- board creation
- board clearing
- board validation
- set and clear cell color
- place and remove flag
- place and remove queen
- generation workflow scaffold
- solver workflow scaffold with one basic rule

## Run

The frontend expects this service on `http://localhost:8080`.

Typical local commands:

```bash
./gradlew bootRun
./gradlew test
```

## Package layout

`src/main/kotlin/com/queens/admin`

- `api/`: controllers and request/response DTOs
- `application/`: façade and workflow orchestration
- `domain/model/`: core board state and operation models
- `domain/service/`: board, generation, validation, and solver services
- `domain/solver/`: solver contracts and rule implementations
- `infrastructure/mapper/`: DTO/domain mapping
- `config/`: Spring/Jackson configuration
