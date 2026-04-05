ALTER TABLE puzzles
    ADD COLUMN IF NOT EXISTS difficulty_tier TEXT,
    ADD COLUMN IF NOT EXISTS difficulty_score INTEGER,
    ADD COLUMN IF NOT EXISTS difficulty_solver_version TEXT,
    ADD COLUMN IF NOT EXISTS difficulty_assessed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS puzzles_difficulty_tier_idx
    ON puzzles (difficulty_tier);

CREATE INDEX IF NOT EXISTS puzzles_difficulty_score_idx
    ON puzzles (difficulty_score);
