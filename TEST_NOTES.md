# Skeleton Mining CO. test-build notes

This branch introduces the first full progression-polish test build.

Validation completed before merge:

- Combined JavaScript syntax check passed with Node.
- All JavaScript-referenced DOM IDs exist in `index.html`.
- GitHub branch comparison shows the branch is ahead of `main` with no divergence.
- Retry flow rebuilds the same saved level layout after a failed attempt.
- Blast Charge startup edge case is guarded so a key found by the blast exits cleanly to results.

Balance values are intentionally centralized in `game-part1.js` for post-playtest adjustment.
