ALTER TABLE puzzles
    ADD COLUMN IF NOT EXISTS target_queen_count INTEGER,
    ADD COLUMN IF NOT EXISTS orthogonal_min_distance INTEGER;

UPDATE puzzles
SET
    target_queen_count = COALESCE(target_queen_count, size),
    orthogonal_min_distance = COALESCE(orthogonal_min_distance, size);

ALTER TABLE puzzles
    ALTER COLUMN target_queen_count SET NOT NULL,
    ALTER COLUMN orthogonal_min_distance SET NOT NULL;

ALTER TABLE puzzles
    ADD CONSTRAINT puzzles_target_queen_count_positive_ck CHECK (target_queen_count >= 1),
    ADD CONSTRAINT puzzles_orthogonal_min_distance_positive_ck CHECK (orthogonal_min_distance >= 1);
