# Reviews

Consolidated review reports produced by the `/ond-review` command.

`/ond-review` runs **every review agent at once, in parallel**:

| Agent | Reviews |
|---|---|
| `ond-reviewer` | Code correctness, React rules, project conventions, CHANGELOG/Docs requirements |
| `ond-dnd-auditor` | D&D 5e (2014) and 5.5e (2024) rules accuracy |

Their findings are merged into one de-duplicated report saved here.

## Usage

```
/ond-review                          # the working-tree diff
/ond-review client/src/utils         # a specific folder
/ond-review HEAD~3..HEAD             # a commit range
```

## Pipeline

```
/ond-research  →  /ond-plan  →  /ond-increment  →  /ond-execute  →  /ond-review  →  commit
```

`/ond-review` is the gate before committing. Fix what it finds, re-run it to confirm the
findings are resolved, and commit once it comes back clean.

## Naming

`YYYY-MM-DD-<short-slug>.md` — e.g. `2026-08-16-exhaustion-levels.md`.

## Findings

Each finding carries a severity and a confidence:

| Severity | Meaning |
|---|---|
| HIGH | Crash, data loss, or a wrong user-visible result |
| MEDIUM | Maintainability problem, missed convention, incomplete change |
| LOW | Naming, polish, minor duplication |

| Confidence | Meaning |
|---|---|
| CONFIRMED | Traced through the code; it definitely breaks |
| PLAUSIBLE | Looks wrong, but couldn't be fully verified |

A HIGH finding must come with a concrete failure case (inputs → wrong result). If one
can't be written, it isn't a HIGH.

## Notes

- The review agents are **read-only**. `/ond-review` reports; it never fixes and never
  commits — you decide what to act on.
- Findings that are deliberately accepted go under **Not addressed** with the reason, so
  a later reader knows they were considered rather than missed.
- A clean diff gets a short report saying so. Manufactured findings are worse than none.
