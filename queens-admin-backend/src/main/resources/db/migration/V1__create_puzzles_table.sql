CREATE TABLE IF NOT EXISTS puzzles (
    id UUID PRIMARY KEY,
    size INTEGER NOT NULL CHECK (size >= 4 AND size <= 20),
    layout TEXT NOT NULL,
    queens TEXT NOT NULL,
    canonical_signature TEXT NOT NULL,
    minimum_group_size INTEGER NOT NULL,
    generation_strategy TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS puzzles_canonical_signature_uq
    ON puzzles (canonical_signature);

CREATE INDEX IF NOT EXISTS puzzles_size_idx
    ON puzzles (size);

CREATE INDEX IF NOT EXISTS puzzles_created_at_idx
    ON puzzles (created_at DESC);
