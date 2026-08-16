# Increments

Execution tracking documents. One file per plan, named to match it:

```
Docs/plans/2026-08-16-exhaustion.md   →   Docs/increments/2026-08-16-exhaustion.md
```

Written by the `ond-incrementer` agent (`/ond-increment`), then worked through by the `ond-executor`
agent (`/ond-execute`). The file is reused across runs, so progress survives an interrupted
session.

## Usage

```
/ond-increment Docs/plans/2026-08-16-exhaustion.md   # build the execution doc + test specs
/ond-execute   Docs/plans/2026-08-16-exhaustion.md   # implement it, one increment at a time
```

`/ond-execute` will refuse to run if the increment file doesn't exist — run `/ond-increment` first.

## Pipeline

```
/ond-research  →  /ond-plan  →  /ond-increment  →  /ond-execute  →  /ond-review  →  commit
```

Splitting `/ond-increment` from `/ond-execute` gives you a review point: you see the test specs
and the breakdown **before** any code is written.

## Statuses

| Status | Meaning |
|---|---|
| `not active` | Not started. Every increment begins here. |
| `active` | Currently being worked. At most one at a time. |
| `done` | Both gates ticked — test written, failed, then passed. |
| `blocked` | Started but cannot proceed. Halts the run; needs a decision. |

## The red/green gate

Every increment passes two gates **in order**. A test written after the implementation
proves nothing — you can't tell whether it would ever have caught the bug.

### 🔴 RED — before implementing
Write the test from the increment's spec, run `cd client && npm test`, confirm it
**fails for the stated reason**. A test that passes before the code exists is asserting
something already true; it gets fixed, not accepted.

### 🟢 GREEN — after implementing
`npm test` passes **and no pre-existing test broke**, plus `npx vite build` is clean.
Only then may the increment be marked `done` and the next one started.

If a gate won't pass, the run **stops**. Nothing advances on a red suite.

### `Test: n/a` increments
Some increments have no assertable logic — a label, a style, the docs/changelog step.
These have no RED gate; they get a concrete verification (build, grep, or a UI check with
an expected value) and a GREEN tick only. Fake tests are never acceptable filler.

## Testing setup

- Runner: **Vitest** — `cd client && npm test` (or `npm run test:watch`)
- Tests live beside their source: `src/utils/foo.js` → `src/utils/foo.test.js`
- Reference pattern: `client/src/utils/dndHelpers.test.js`
- The pure helpers in `src/utils/` are the testable core — they hold the D&D math and
  return plain values. There is no component-test setup, so no DOM/render tests.

## The guard

The executor picks its work by a fixed rule, not judgment:

1. If one increment is `active`, resume it (a previous run was interrupted).
2. Otherwise take the **first** increment that is `not active`.
3. If more than one is `active`, stop — the state is corrupted.
4. If all are `done`, the plan is complete.

It marks an increment `active` **before** editing and `done` only **after** both gates
pass. It never skips ahead and never batches.

## Finishing

Before a run is declared finished, all of the following must hold:

- every increment reads `done` with its gates ticked
- the **full** suite passes (`npm test`), not just the new tests
- `npx vite build` passes
- the plan's `## Verification` section has been run
- the CHANGELOG entry and `Docs/` updates named in the plan are applied
- **Overall status** in this file is set to `complete`

Partial completion is reported honestly (`3/5 done, blocked on #4`) rather than rounded
up. Resuming is just re-running `/ond-execute` on the same plan.
