# TODO

## Queens

### Solver research

Investigate whether there are valid Queens puzzles that:

- have exactly one solution
- cannot be solved by the approved staged difficulty solver
- can only be resolved by brute-force style search or deeper assumption branching

Possible research direction:

- run brute-force search from multiple starting assumptions or branch orders
- compare whether different branch starts still converge on the same single solution
- only treat a puzzle as valid if uniqueness can be established, not just solvability

This is intentionally out of scope for the current generation pipeline.
For now, puzzles that the approved staged solver cannot solve should be treated as `UNSOLVABLE` and should not be saved.
