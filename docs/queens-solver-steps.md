# Queens Solver Steps

This document describes the current configured Queens solver steps, how they behave, and how suitable they are for teaching or hinting.

## Configured Execution Order

The canonical staged solver uses:

1. precheck logic
2. `Single Color Queen`
3. configured built-in steps and patterns in sort order, limited to the currently unlocked tier
4. tier escalation if nothing changes

The current configured built-in order is:

1. `Single Color Queen`
2. `Row / Column Constraints`
3. `Row / Column Set Constraints`
4. `Group Confined To Line`
5. `Single Queen Contradiction`
6. `Assume Queen Until Progress`
7. `Assume Queen Exhaustive`

Patterns are inserted into the configured order from the pattern catalog using their own sort order.

## Step Table

| Step Name | Detects | Action | Difficulty | Good For Hint |
|----------|--------|--------|-----------|--------------|
| `Single Color Queen` | A color group has exactly one candidate left | Places a queen and auto-flags resulting conflicts | Extra Easy | Later queen hints |
| `Group Confined To Line` | A color group's candidates are trapped in one row or column | Flags cells on that line that can no longer contain a queen | Extra Easy | Yes |
| `pc-1` | Persisted pattern match | Flags cells | Extra Easy | Not first-phase |
| `solver-pattern-3` | Persisted pattern match | Flags cells | Extra Easy | Not first-phase |
| `pc-2` | Persisted pattern match | Flags cells | Easy | Maybe later |
| `solver-pattern-4` | Persisted pattern match | Flags cells | Medium | Maybe later |
| `solver-pattern-5` | Persisted pattern match | Flags cells | Medium | Maybe later |
| `solver-pattern-6` | Persisted pattern match | Flags cells | Medium | Maybe later |
| `solver-pattern-7` | Persisted pattern match | Flags cells | Medium | Maybe later |
| `Row / Column Constraints` | A consecutive band of rows or columns reserves itself for the same number of groups | Flags other groups out of that band | Hard | Advanced |
| `Single Queen Contradiction` | One candidate square cannot be a queen because that assumption immediately breaks the board | Flags that candidate | Hard | Advanced |
| `Row / Column Set Constraints` | A non-consecutive row or column set inside one distance span reserves itself for the same number of groups | Flags other groups out of that set | Extra Hard | No early hint |
| `Assume Queen Until Progress` | Assumption search finds a forced move | Places a forced flag or queen | Unsolvable | No |
| `Assume Queen Exhaustive` | Repeated assumption search keeps finding forced moves | Places repeated forced moves | Unsolvable | No |

## Built-In Steps

### Single Color Queen

What it detects:
- a color group has exactly one valid candidate square left

Conditions:
- the group has no queen yet
- all but one candidate have been eliminated

Action:
- places a queen in that square
- applies the normal queen side effects, including new flags

Why it exists:
- it is the simplest deterministic Queens move
- the staged solver always checks it before the rest of the configured step list

Hint suitability:
- good for future queen-placement hints
- not the first flag-focused hint rule

### Group Confined To Line

What it detects:
- all remaining candidates for a color group lie in a single row or a single column

Conditions:
- the group still has multiple candidates
- every candidate shares the same row, or every candidate shares the same column
- the minimum spacing rule makes nearby cells on that line impossible for other queens

Action:
- flags cells on that row or column that cannot contain a queen

Why it exists:
- it is local, visual, and easy to explain
- it is currently one of the best human-teachable flagging rules

Hint suitability:
- best current Phase 1 hint candidate

### Row / Column Constraints

What it detects:
- a consecutive band of `N` rows or columns inside a queen-distance window contains all remaining candidates for exactly `N` color groups

Conditions:
- the line band is consecutive
- the relevant perpendicular span fits within the minimum queen-distance window
- exactly the same number of groups are trapped there as the band size

Action:
- flags other groups' candidates inside that reserved band/window

Why it exists:
- it captures stronger line-based counting logic than `Group Confined To Line`

Hint suitability:
- possible later, but it is more abstract to explain

### Row / Column Set Constraints

What it detects:
- the same reservation logic as `Row / Column Constraints`, but with non-consecutive rows or columns that still fit inside one queen-distance span

Conditions:
- the chosen rows or columns do not need to be adjacent
- the full span of the set must still fit inside the relevant distance window
- exactly the same number of groups are trapped there as the set size

Action:
- flags other groups' candidates inside that reserved set/window

Why it exists:
- some puzzles require non-adjacent line-set reasoning
- that logic is meaningfully harder than the consecutive-band version

Hint suitability:
- not a good early hint step

### Single Queen Contradiction

What it detects:
- a single candidate square cannot hold a queen because placing one there immediately creates a contradiction

Conditions:
- the square is currently a legal queen candidate
- a temporary queen assumption immediately breaks the board

Action:
- flags the tested square

Why it exists:
- it is a bounded contradiction rule
- it is cheaper and more controlled than full assumption solving

Hint suitability:
- useful for advanced hinting
- less teachable for a first hint pass

### Assume Queen Until Progress

What it detects:
- broader assumption search where contradictions force a move

Action:
- may place flags or queens

Why it exists:
- useful as an admin solving fallback
- not considered part of the approved human-solving difficulty ladder

Hint suitability:
- no

### Assume Queen Exhaustive

What it detects:
- repeated assumption search until no further forced move exists

Action:
- may place flags or queens

Why it exists:
- strongest admin fallback
- intentionally outside the approved human-solving ladder

Hint suitability:
- no

## Persisted Patterns

Patterns are part of the configured solver, but they are stored as data rather than encoded as named built-in rules.

Important properties:
- pattern ids are persisted
- geometry and matching data live in stored pattern definitions
- difficulty and sort order are exposed through the pattern catalog
- backend canonical overrides can force known pattern ids to specific tiers

Current canonical pattern tiers:

| Pattern Id | Difficulty |
|-----------|------------|
| `pc-1` | Extra Easy |
| `pc-2` | Easy |
| `solver-pattern-3` | Extra Easy |
| `solver-pattern-4` | Medium |
| `solver-pattern-5` | Medium |
| `solver-pattern-6` | Medium |
| `solver-pattern-7` | Medium |

Why patterns are a weaker first hint candidate:
- they can flag cells, but the explanation tends to depend on stored geometry rather than a named human rule
- they are better once the hint system can return rich visual metadata for the exact matched shape

## Raw Rules That Still Exist Outside The Current Ladder

The raw engine still contains rules that are not part of the current configured grading ladder.

Examples:
- `forced-coverage-queen`
- `axis-isolation-forced-queen`
- `flag-assumption-contradiction`
- `constrained-window`
- `flag-squares-without-color-groups`

These are still useful operationally, but they should not be treated as part of the canonical difficulty ladder unless they are explicitly added to the backend config.

## Flag, Queen, Or Both

Flag-only steps:
- `Group Confined To Line`
- `Row / Column Constraints`
- `Row / Column Set Constraints`
- `Single Queen Contradiction`
- all persisted patterns
- generation precheck for uncolored squares

Queen-first steps:
- `Single Color Queen`

Can do both:
- `Assume Queen Until Progress`
- `Assume Queen Exhaustive`

## Hint Recommendation

The best first hint rule is `Group Confined To Line`.

Why:
- it is one of the earliest configured steps
- it produces flag placements, which matches the intended first hint shape
- it is concrete enough to explain to a player in plain language
- it is easier to teach than patterns, band-counting rules, or contradiction rules
