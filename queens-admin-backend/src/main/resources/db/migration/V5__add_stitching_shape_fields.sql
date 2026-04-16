ALTER TABLE puzzles
    ADD COLUMN IF NOT EXISTS piece_kind TEXT NOT NULL DEFAULT 'STANDARD',
    ADD COLUMN IF NOT EXISTS left_blackout_signature TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS top_blackout_signature TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS puzzles_piece_kind_idx
    ON puzzles (piece_kind);

CREATE INDEX IF NOT EXISTS puzzles_left_blackout_signature_idx
    ON puzzles (left_blackout_signature);

CREATE INDEX IF NOT EXISTS puzzles_top_blackout_signature_idx
    ON puzzles (top_blackout_signature);
