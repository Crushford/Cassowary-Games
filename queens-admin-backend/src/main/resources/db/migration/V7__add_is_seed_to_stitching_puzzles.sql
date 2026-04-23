ALTER TABLE stitching_puzzles
    ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS stitching_puzzles_is_seed_idx
    ON stitching_puzzles (is_seed);
