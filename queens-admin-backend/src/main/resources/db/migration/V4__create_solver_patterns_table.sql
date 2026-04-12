CREATE TABLE IF NOT EXISTS solver_patterns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    cells_json TEXT NOT NULL,
    output_flags_json TEXT NOT NULL,
    difficulty_tier TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS solver_patterns_sort_order_idx
    ON solver_patterns (sort_order);

INSERT INTO solver_patterns (
    id,
    name,
    size,
    cells_json,
    output_flags_json,
    difficulty_tier,
    enabled,
    sort_order,
    created_at,
    updated_at
)
SELECT
    'pc-1',
    'pc-1',
    3,
    '[{"row":0,"col":1,"activeSquare":true},{"row":1,"col":1,"activeSquare":true},{"row":1,"col":2,"activeSquare":true}]',
    '[{"row":0,"col":2},{"row":1,"col":0},{"row":2,"col":1}]',
    'MEDIUM',
    TRUE,
    100,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM solver_patterns WHERE id = 'pc-1'
);

INSERT INTO solver_patterns (
    id,
    name,
    size,
    cells_json,
    output_flags_json,
    difficulty_tier,
    enabled,
    sort_order,
    created_at,
    updated_at
)
SELECT
    'pc-2',
    'pc-2',
    4,
    '[{"row":1,"col":2,"activeSquare":true},{"row":2,"col":1,"activeSquare":true}]',
    '[{"row":0,"col":1},{"row":1,"col":0},{"row":1,"col":1},{"row":2,"col":2},{"row":2,"col":3},{"row":3,"col":2}]',
    'MEDIUM',
    TRUE,
    110,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM solver_patterns WHERE id = 'pc-2'
);
