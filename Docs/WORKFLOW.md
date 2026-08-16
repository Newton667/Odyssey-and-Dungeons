# Workflow Cheatsheet

Five commands take a feature from idea to committed code — each runs in its own agent,
writes a file you can read, and hands off to the next. A sixth, `/ond-execute-ultra`,
runs the build half of that chain unattended.

```
/ond-research → /ond-plan → /ond-increment → /ond-execute → /ond-review → commit
      ↓             ↓             ↓               ↓              ↓
    Docs/         Docs/         Docs/           (code)         Docs/
  research/       plans/     increments/       + tests        reviews/
```

Every command is prefixed `ond-` so none of them collide with Claude Code's built-ins
(`/plan` enters plan mode, `/review` is the built-in code review). Type `/ond` to see
all six.

You review between every stage. Nothing advances on its own.

---

## The commands

| Command | Does | Writes to | Touches code? |
|---|---|---|---|
| `/ond-research <topic>` | Investigates the codebase, the D&D rulebooks, and the web. Ends with options + a recommendation. | `Docs/research/` | No |
| `/ond-plan <what to build>` | Turns a direction into ordered **increments**. | `Docs/plans/` | No |
| `/ond-increment [plan]` | Expands each increment with a **unit test spec** and red/green gates. | `Docs/increments/` | No |
| `/ond-execute [plan]` | Builds it — **test first (red), then code (green)**, one increment at a time. | code + tests | **Yes** |
| `/ond-review [scope]` | Runs **all** review agents at once — code + D&D rules — and merges the findings. | `Docs/reviews/` | No |
| `/ond-execute-ultra [plan]` | **All of the above in one shot** — increments, build, review. Stops on the first failure. | all of them | **Yes** |

Only `/ond-execute` (and `/ond-execute-ultra`, which wraps it) can change code. The rest are read-only.

---

## Typical run

```bash
/ond-research how should we track concentration on spells
#  → reads the PHB, the codebase, the web
#  → Docs/research/2026-08-16-concentration.md  · recommends an approach

# read it. agree? then:

/ond-plan add concentration tracking to the character sheet
#  → picks up the research automatically
#  → Docs/plans/2026-08-16-concentration.md  · 4 increments

# read it. happy? then:

/ond-increment Docs/plans/2026-08-16-concentration.md
#  → Docs/increments/2026-08-16-concentration.md
#  → each increment now has a test spec + red/green checkboxes

# review the test specs — this is your last checkpoint before code. then:

/ond-execute Docs/plans/2026-08-16-concentration.md
#  → inc 1: write test → 🔴 fails → implement → 🟢 passes → done
#  → inc 2: ... never starts until inc 1 is green

/ond-review
#  → reviewer + DNDAuditor in parallel → Docs/reviews/...

# fix findings → /ond-review again → clean → commit
```

**Skip stages when the work is small.** A one-line fix doesn't need research, a plan, or
increments — just fix it and `/ond-review`. The full chain earns its keep on anything you'd
otherwise get wrong twice.

---

## One-shot mode: `/ond-execute-ultra`

Runs the whole pipeline unattended, delegating each stage to the agent that owns it:

```
/ond-execute-ultra Docs/plans/2026-08-16-player-reported-bug-fixes.md
```

| Stage | Agent(s) | Gate before continuing |
|---|---|---|
| 1. Increments + test specs | `ond-incrementer` | stops if the plan can't be broken down |
| 2. Build, one increment at a time | `ond-executor` | stops unless **every** increment is `done` |
| 3. Review | `ond-reviewer` **+** `ond-dnd-auditor`, in parallel | — |
| 4. Consolidate into one report | (orchestrator) | — |

Same guard and same red/green gates as the manual path — it skips the *review checkpoints*,
not the safety checks. It **stops at the first blocked increment or failed gate** rather
than pushing through, and never commits, pushes, or fixes its own review findings.

**Use the step-by-step path when** you want to review the test specs before code exists, or
the plan is large and you'd rather catch a wrong spec early. **Use ultra when** the plan is
well understood and you just want it built.

If Stage 1 finds an existing increment file with progress in it, ultra resumes from there
instead of regenerating.

---

## The red/green gate

Every increment passes two gates **in this order**. Order is the whole point: a test
written *after* the code proves nothing, because you can't tell whether it would ever
have caught the bug.

### 🔴 RED — before writing any implementation
Write the test from the increment's spec. Run `cd client && npm test`. It **must fail**,
for the reason the spec predicted.

> If it passes before you've implemented anything, the test is asserting something
> already true — it's worthless. It gets fixed, not accepted.

### 🟢 GREEN — after implementing
`npm test` passes, **and no pre-existing test broke**. Then `npx vite build` is clean.
Only now can the increment be marked `done` and the next one begin.

**A red suite stops the run.** Nothing advances on failing tests.

### `Test: n/a` increments
Some increments have no assertable logic — a label, a style, the docs/changelog step.
No RED gate for those: they get a concrete verification (build, grep, or a UI check with
an expected value) and a GREEN tick only. Fake tests are never acceptable filler.

---

## Increments

`/ond-plan` slices work into increments; `/ond-increment` adds their test specs. Each one:

- leaves the app **buildable** — never a half-broken state
- is **independently verifiable** — a real check, not "looks right"
- is ordered by dependency: data → logic → UI
- the **last one is always** docs + CHANGELOG

| Status | Meaning |
|---|---|
| `not active` | Not started — every increment starts here |
| `active` | Being worked right now — only ever one |
| `done` | Both gates ticked |
| `blocked` | Stuck; halts the run and needs your call |

### The guard

`/ond-execute` picks its work by a fixed rule, never judgment:

1. One increment `active`? → **resume it** (a previous run was interrupted)
2. Otherwise → take the **first `not active`** one, top down
3. Two or more `active`? → **stop**, the state is corrupted
4. All `done`? → complete

It marks an increment `active` **before** editing and `done` only **after** both gates
pass. Interrupted? Re-run `/ond-execute` — it picks up exactly where it stopped.

### Before it can say "finished"

All of these, re-read from the file rather than remembered:

1. every increment `done`, with both gates ticked
2. the **full** suite passes — every test, not just the new ones
3. `npx vite build` clean
4. the plan's `## Verification` section ran
5. CHANGELOG + `Docs/` updates applied
6. Overall status set to `complete`

Otherwise it reports honestly: `3/5 done, blocked on #4`.

---

## Testing

```bash
cd client && npm test          # run once
cd client && npm run test:watch
```

- Runner: **Vitest**
- Tests sit beside their source: `src/utils/foo.js` → `src/utils/foo.test.js`
- Reference pattern: `client/src/utils/dndHelpers.test.js`
- The pure helpers in `src/utils/` are the testable core — they hold the D&D math and
  return plain values. There's no component-test setup, so no DOM/render tests.
- Logic buried in a page component should move to a `src/utils/` helper to become
  testable; `/ond-increment` flags these.

---

## The agents

| Agent | Role | Can edit? |
|---|---|---|
| `ond-researcher` | Investigates — codebase, rulebook PDFs, web | No |
| `ond-planner` | Writes increment-based plans | Plans only |
| `ond-incrementer` | Writes execution docs + test specs | Increment docs only |
| `ond-executor` | Implements, test-first, one increment at a time | **Yes** |
| `ond-reviewer` | Code correctness, React rules, project conventions | No |
| `ond-dnd-auditor` | D&D 5e (2014) + 5.5e (2024) rules accuracy | No |

`/ond-review` launches `ond-reviewer` and `ond-dnd-auditor` **in parallel**, de-duplicates, and merges
into one report. Findings are marked **CONFIRMED** (traced, definitely breaks) or
**PLAUSIBLE** (looks wrong, unverified).

All six live in `.claude/` — **project-local and gitignored**, so they exist only in this
repo on this machine. The `Docs/` output folders *are* committed.

---

## What the agents already know

Preloaded with this project's rules, so you don't have to repeat them:

- `CLAUDE.md` and `Docs/known-patterns-and-gotchas.md` are read first, every time
- CHANGELOG + `Docs/` updates are mandatory, never optional
- version bumps only on **push**, never unprompted
- never define a React component inside another component
- `NumInput` for numbers — parse with `Number.isNaN`, never a falsy fallback
- feat/feature arrays may hold strings **or** objects from old saves
- AC is auto-recomputed → use `acBonus`/`acOverride`
- ability scores = `abilityScores` (base) + `abilityBonuses` (misc), kept separate
- ruleset behavior routes through `char.ruleset` — spell math lives in **three** places
- **the build does not catch undefined variables** — always grep after a rename

---

## Gotchas

- **Restart Claude Code after adding a command.** New `.claude/skills/` directories
  aren't picked up by the file watcher mid-session.
- **`/ond-execute` needs `/ond-increment` first.** It refuses to run without the increment file,
  since that's where the test specs live.
- **Old plans won't execute.** Plans predating the increment format have no
  `## Increments` section — re-run `/ond-plan`.
- **Nothing commits or pushes automatically.** Every command leaves changes in the
  working tree for you to inspect.
- **Agents can be wrong.** `/ond-review` spot-checks HIGH findings before repeating them,
  but treat a PLAUSIBLE finding as a lead, not a verdict.
