CREATE TABLE IF NOT EXISTS stitching_puzzles (
    id UUID PRIMARY KEY,
    size INT NOT NULL,
    layout TEXT NOT NULL,
    queens TEXT NOT NULL,
    target_queen_count INT NOT NULL,
    queen_count INT NOT NULL,
    orthogonal_min_distance INT NOT NULL,
    minimum_group_size INT NOT NULL,
    generation_strategy TEXT NOT NULL,
    piece_kind TEXT NOT NULL,
    left_blackout_signature TEXT NOT NULL DEFAULT '',
    top_blackout_signature TEXT NOT NULL DEFAULT '',
    left_blackout_fingerprint TEXT NOT NULL DEFAULT '',
    top_blackout_fingerprint TEXT NOT NULL DEFAULT '',
    fingerprint_key TEXT NOT NULL,
    piece_category TEXT NOT NULL,
    canonical_signature TEXT NOT NULL UNIQUE,
    difficulty_tier TEXT,
    difficulty_score INT,
    difficulty_solver_version TEXT,
    difficulty_assessed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS stitching_puzzles_fingerprint_key_idx
    ON stitching_puzzles (fingerprint_key);

CREATE INDEX IF NOT EXISTS stitching_puzzles_piece_category_idx
    ON stitching_puzzles (piece_category);

CREATE INDEX IF NOT EXISTS stitching_puzzles_piece_kind_idx
    ON stitching_puzzles (piece_kind);

CREATE INDEX IF NOT EXISTS stitching_puzzles_left_blackout_fingerprint_idx
    ON stitching_puzzles (left_blackout_fingerprint);

CREATE INDEX IF NOT EXISTS stitching_puzzles_top_blackout_fingerprint_idx
    ON stitching_puzzles (top_blackout_fingerprint);
