# Stitching Content Pipeline — Implementation Plan

**Branch:** `add-puzzle-stitching`  
**Goal:** Batch-generate irregular ("stitchable") puzzle pieces, store them in a dedicated DB table keyed by blackout fingerprint, and export them as fingerprint-bucketed JSON catalogs for the frontend to consume — separate from the normal Queens puzzle flow.

---

## Status key
- [ ] Not started
- [x] Done
- [~] Partial / implemented with first-pass scope

---

## 1. Database — `stitching_puzzles` table

**Migration:** `V6__create_stitching_puzzles_table.sql`

New table `stitching_puzzles` — separate from `puzzles` so existing catalog tooling is unaffected.

Columns:
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `size` | INT | board width/height |
| `layout` | TEXT | region char per cell (same encoding as `puzzles.layout`) |
| `queens` | TEXT | 'Q'/'.'/blocked (same encoding as `puzzles.queens`) |
| `target_queen_count` | INT | queens required before stitch |
| `queen_count` | INT | actual queens placed |
| `orthogonal_min_distance` | INT | |
| `minimum_group_size` | INT | |
| `generation_strategy` | TEXT | |
| `piece_kind` | TEXT | `TOP_LEFT` / `TOP_RIGHT` / `BOTTOM_LEFT` / `BOTTOM_RIGHT` |
| `left_blackout_signature` | TEXT | comma-separated ints e.g. `"3,2,1,0,0,0,0"` |
| `top_blackout_signature` | TEXT | comma-separated ints |
| `left_blackout_fingerprint` | TEXT | canonical hash of left sig (see §2) |
| `top_blackout_fingerprint` | TEXT | canonical hash of top sig |
| `fingerprint_key` | TEXT | `left_fingerprint:top_fingerprint` combined key |
| `piece_category` | TEXT | `LEFT_ONLY` / `TOP_ONLY` / `BOTH` / `STANDARD` |
| `canonical_signature` | TEXT | UNIQUE — prevents duplicate boards |
| `difficulty_tier` | TEXT? | nullable, filled after difficulty assessment |
| `difficulty_score` | INT? | |
| `difficulty_solver_version` | TEXT? | |
| `difficulty_assessed_at` | TIMESTAMP? | |
| `created_at` | TIMESTAMP | |

- [x] Write `V6__create_stitching_puzzles_table.sql`

---

## 2. Fingerprint design

A **fingerprint** is a stable, canonical identifier for a blackout shape so that puzzle pieces with identical shapes can be grouped.

Rules:
- A signature is stored explicitly as row-prefix or column-prefix counts. Validation enforces board-size length and in-range prefix counts; we are not reparsing layout strings later to rediscover the shape.
- Fingerprint = hex-encoded SHA-1 of the canonical signature string (e.g. `"3,2,1"`).
- `left_blackout_fingerprint` = fingerprint of trimmed left signature; `""` if all zeros.
- `top_blackout_fingerprint` = fingerprint of trimmed top signature; `""` if all zeros.
- `fingerprint_key` = `"{left}:{top}"` (empty string for that side if no blackout).
- `piece_category`:
  - `STANDARD` — both fingerprints empty
  - `LEFT_ONLY` — left non-empty, top empty
  - `TOP_ONLY` — top non-empty, left empty
  - `BOTH` — both non-empty

**New service:** `StitchingFingerprintService`
- `fingerprintForSignature(sig: List<Int>): String` — trims trailing zeros, returns SHA-1 hex or `""` if empty
- `categoryFor(leftFp: String, topFp: String): String`
- `validateSignature(sig: List<Int>, boardSize: Int)` — throws if not valid non-increasing prefix

- [x] Implement `StitchingFingerprintService`

---

## 3. Backend domain model + persistence

### `PersistedStitchingPuzzle` (domain model)

```kotlin
data class PersistedStitchingPuzzle(
    val id: UUID,
    val size: Int,
    val layout: String,
    val queens: String,
    val targetQueenCount: Int,
    val queenCount: Int,
    val orthogonalMinDistance: Int,
    val minimumGroupSize: Int,
    val generationStrategy: String,
    val pieceKind: String,
    val leftBlackoutSignature: List<Int>,
    val topBlackoutSignature: List<Int>,
    val leftBlackoutFingerprint: String,
    val topBlackoutFingerprint: String,
    val fingerprintKey: String,
    val pieceCategory: String,
    val canonicalSignature: String,
    val difficultyTier: String?,
    val difficultyScore: Int?,
    val difficultySolverVersion: String?,
    val difficultyAssessedAt: Instant?,
    val createdAt: Instant,
)
```

- [x] Create `PersistedStitchingPuzzle.kt`

### `StitchingPuzzlesTable` (Exposed)

Mirrors the migration columns above using `UUIDTable("stitching_puzzles")`.

- [x] Create `StitchingPuzzlesTable.kt`

### `StitchingPuzzleRepository`

Methods:
- `save(puzzle: PersistedStitchingPuzzle)`
- `existsByCanonicalSignature(sig: String): Boolean`
- `findByFingerprintKey(key: String): List<PersistedStitchingPuzzle>`
- `findByPieceCategory(category: String): List<PersistedStitchingPuzzle>`
- `findAll(): List<PersistedStitchingPuzzle>`
- `countByFingerprintKey(): Map<String, Int>` — for stats

- [x] Create `StitchingPuzzleRepository.kt`

---

## 4. Application services

### `StitchingCatalogService`

Wraps repository with business logic:
- `savePiece(piece: PersistedStitchingPuzzle)` — checks for duplicate canonical signature before inserting
- `getPiecesByFingerprintKey(key: String): List<PersistedStitchingPuzzle>`
- `getStats(): StitchingCatalogStatsDto` — count by fingerprint key + piece category
- `findAll(): List<PersistedStitchingPuzzle>`

- [x] Create `StitchingCatalogService.kt`

### `StitchingBatchService`

Async batch generation, same pattern as `BatchGenerationService`:

- `ConcurrentHashMap<String, StitchingBatchSnapshot>` keyed by `batchId`
- `CompletableFuture` + thread pool for generation
- `AtomicBoolean cancelled` per batch
- Methods:
  - `startBatch(request: StitchingBatchRequest): String` — returns `batchId`
  - `getBatchStatus(batchId: String): StitchingBatchSnapshot?`
  - `cancelBatch(batchId: String): Boolean`
  - `getAllBatches(): List<StitchingBatchSnapshot>`

Request shape:
```kotlin
data class StitchingBatchRequest(
    val fingerprintKey: String,      // "left_fp:top_fp" — determines which shape to generate
    val leftBlackoutSignature: List<Int>,
    val topBlackoutSignature: List<Int>,
    val pieceKind: String,           // TOP_LEFT / TOP_RIGHT / BOTTOM_LEFT / BOTTOM_RIGHT
    val targetCount: Int,            // how many pieces to generate
    val targetQueenCount: Int,       // queen target for this piece kind
    val size: Int,                   // board size (default 7)
)
```

Each run:
1. Calls `StitchingPreviewService.buildIrregularQuadrant()` (or a lower-level equivalent) with the requested signatures + target queen count
2. Computes canonical signature; skips if duplicate
3. Computes fingerprints via `StitchingFingerprintService`
4. Constructs `PersistedStitchingPuzzle` and calls `StitchingCatalogService.savePiece()`

- [x] Create snapshot/state data classes (`StitchingBatchSnapshot`, etc.)
- [x] Create `StitchingBatchService.kt`

Implementation note:
- The batch service runs exact-signature jobs and saves them into `stitching_puzzles`.
- The admin UX supports both preview-derived exact-signature runs and backend-driven reachable-fingerprint presets (`ALL_LEFT_ONLY`, `ALL_TOP_ONLY`, `ALL_BOTH`, `ALL_REACHABLE`).
- Reachable fingerprint-space counts are computed server-side for the 7x7 / orthogonal-distance-5 stitched system and exposed to the admin UI.
- Large preset batches keep aggregate progress plus recent activity in the UI instead of trying to materialize every queued run client-side.

---

## 5. API layer

### DTOs

- `StitchingBatchRequestDto` — frontend → backend
- `StitchingBatchStatusDto` — backend → frontend (mirrors `BatchGenerationStatusDto` pattern)
- `StitchingCatalogStatsDto` — counts by fingerprint key and category
- `StitchingBatchStartedDto` — `{ batchId: String }`

- [x] Create DTO files

### `StitchingCatalogController`

`@RestController @RequestMapping("/api/stitching")`

Endpoints:
| Method | Path | Description |
|---|---|---|
| `POST` | `/batch/start` | Start a batch generation run |
| `GET` | `/batch/{batchId}` | Get batch status |
| `POST` | `/batch/{batchId}/cancel` | Cancel a batch |
| `GET` | `/batch` | List all batches |
| `GET` | `/catalog/stats` | Catalog stats (counts by fingerprint) |
| `POST` | `/catalog/export` | Trigger JSON export, returns output path |

- [x] Create `StitchingCatalogController.kt`

---

## 6. JSON export

### `StitchingJsonExportService`

Exports `stitching_puzzles` as fingerprint-bucketed JSON files:

```
<output-dir>/
  stitching/
    index.json                          ← list of all buckets with counts
    <fingerprint-key>/
      <piece-kind>.json                 ← array of puzzle objects for that shape + position
```

`index.json` shape:
```json
[
  {
    "fingerprintKey": "abc123:def456",
    "pieceCategory": "BOTH",
    "leftBlackoutSignature": [3,2,1,0,0,0,0],
    "topBlackoutSignature": [0,0,0,1,2,3,0],
    "counts": {
      "TOP_LEFT": 12,
      "TOP_RIGHT": 8,
      "BOTTOM_LEFT": 9,
      "BOTTOM_RIGHT": 11
    }
  }
]
```

Each `<piece-kind>.json` contains an array of puzzle objects (same fields as `PersistedStitchingPuzzle`, minus internal DB fields).

- [x] Create `StitchingJsonExportService.kt`

### CLI export tool

`tools/ExportStitchingCatalog.kt` — same pattern as `ExportPuzzlesJson.kt`:
- Reads output directory from args
- Calls `StitchingJsonExportService.exportCatalogs(path)`
- Prints summary

- [x] Create `ExportStitchingCatalog.kt`

---

## 7. Frontend — batch generation UI

Additions to `QueensAdminStitchingPanel.vue`:

### New section: "Catalog"

Below the existing stitching preview section, add a collapsible "Catalog" section with two subsections:

**Stats panel**
- Fetches `/api/stitching/catalog/stats` on mount
- Shows table: fingerprint key | category | piece counts per kind

**Batch generation form**
- Inputs:
  - Fingerprint key (auto-populated from the current preview's quadrant signatures)
  - Piece kind (dropdown: TOP_LEFT / TOP_RIGHT / BOTTOM_LEFT / BOTTOM_RIGHT)
  - Target count (number, default 20)
  - Queen count target (auto-filled from piece kind: 10 for TOP_LEFT, 9 for others)
- "Start batch" button → `POST /api/stitching/batch/start`
- Live status display: polls `GET /api/stitching/batch/{batchId}` every 2 seconds while running
  - Shows progress bar: completed / total
  - Shows per-run table: state | queen count | saved? | error
- Cancel button → `POST /api/stitching/batch/{batchId}/cancel`

**Export button**
- "Export to JSON" → `POST /api/stitching/catalog/export`
- Shows returned output path

### New API calls (in `api.ts`)

- `startStitchingBatch(request): Promise<{ batchId: string }>`
- `getStitchingBatchStatus(batchId): Promise<StitchingBatchStatusDto>`
- `cancelStitchingBatch(batchId): Promise<void>`
- `getStitchingCatalogStats(): Promise<StitchingCatalogStatsDto>`
- `exportStitchingCatalog(): Promise<{ outputPath: string }>`

### New types (in `types.ts`)

- `StitchingBatchRequest`
- `StitchingBatchStatus`
- `StitchingCatalogStats`

- [x] Add new API calls and types
- [x] Add Catalog section UI to `QueensAdminStitchingPanel.vue`

Implemented UI scope:
- The stitching tab now includes a dedicated catalog panel.
- The panel can start a stitching batch from the current preview's stitched-piece fingerprints, poll progress, cancel a running batch, refresh catalog stats, and export fingerprint-bucketed JSON.
- Stats show exact fingerprint buckets and counts by piece kind from the dedicated stitching table.
- The panel now also includes a separate Phase 1 discovery scheduler that expands reachable fingerprint buckets outward from real seed puzzles, tracks generated/skipped/failed/inferred/queued buckets, supports interrupt, and persists its UI inputs in local storage.

### Discovery scheduler scope

This replaced the earlier assumption that we should try to brute-force every theoretical fingerprint combination.

Phase 1 now focuses on **reachable fingerprint discovery and validation**:
- Start from a real normal 7x7 seed puzzle
- Derive outgoing right and bottom bleed signatures
- Infer required `LEFT_ONLY`, `TOP_ONLY`, and `BOTH` stitched buckets
- Skip already-satisfied buckets by default, but still expand from an existing saved puzzle in that bucket
- Generate at most one new puzzle per inferred bucket in a run
- When a new fingerprint cannot hit the default stitched target, save it at the computed max achievable queen count and treat that saved queen count as the cached max for future runs of the same fingerprint
- Record inferred, generated, skipped, failed, and queued states separately
- Stop when the queue is exhausted, the user interrupts, or the configured generation limit is reached

- [x] Add discovery scheduler backend service and API endpoints
- [x] Add discovery scheduler UI to the stitching tab
- [x] Persist discovery and batch inputs in local storage

### Follow-up TODOs

- [ ] Support multiple seed puzzles in one discovery run instead of a single generated seed
- [ ] Add Phase 2 refill mode to generate multiple puzzle variants for validated fingerprint buckets
- [ ] Decide whether failed buckets should be retried later under different queen-count targets
- [ ] Add better scheduler prioritisation once the reachable frontier grows large
- [ ] Consider promoting saved provenance into longer-lived persistence if bucket-debugging becomes a recurring need

---

## 8. Implementation order

1. **V6 migration** — unblocks all persistence work
2. **`StitchingFingerprintService`** — needed by batch service + repository
3. **`PersistedStitchingPuzzle` + `StitchingPuzzlesTable` + `StitchingPuzzleRepository`**
4. **`StitchingCatalogService`**
5. **`StitchingBatchService`** + snapshot DTOs
6. **`StitchingCatalogController`** + API DTOs
7. **`StitchingJsonExportService`** + `ExportStitchingCatalog.kt`
8. **Frontend** — types, API calls, UI

Progress:
1. [x] V6 migration
2. [x] `StitchingFingerprintService`
3. [x] `PersistedStitchingPuzzle` + `StitchingPuzzlesTable` + `StitchingPuzzleRepository`
4. [x] `StitchingCatalogService`
5. [x] `StitchingBatchService` + snapshot DTOs
6. [x] `StitchingCatalogController` + API DTOs
7. [x] `StitchingJsonExportService` + `ExportStitchingCatalog.kt`
8. [x] Frontend types, API, and stitching-tab catalog panel

Validation completed:
- [x] Backend Gradle build and tests
- [x] Frontend production build

---

## 9. Out of scope for this branch

- Frontend player experience (consuming the generated catalog files in-game)
- Difficulty assessment for stitching pieces (the fields exist in the schema for later)
- Cross-quadrant validation that a stitched set is actually solvable as a whole (the preview UI handles this manually for now)
