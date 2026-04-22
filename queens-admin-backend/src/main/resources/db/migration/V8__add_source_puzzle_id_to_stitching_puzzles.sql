ALTER TABLE stitching_puzzles
    ADD COLUMN IF NOT EXISTS source_puzzle_id UUID NULL;

CREATE INDEX IF NOT EXISTS stitching_puzzles_source_puzzle_id_idx
    ON stitching_puzzles (source_puzzle_id);
