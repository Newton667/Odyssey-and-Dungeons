# Research

Findings produced by the `ond-researcher` agent via the `/ond-research` command.

## Usage

```
/ond-research how should we model concentration on spells
/ond-research what changed for Barbarian rage in the 2024 rules
/ond-research options for drag-and-drop reordering of inventory items
```

The researcher investigates the codebase, the D&D rulebook PDFs in the repo root, and
the web (in its own context, so it doesn't consume the main conversation), then writes
one document here. It never modifies application code.

## Pipeline

```
/ond-research  →  /ond-plan  →  /ond-increment  →  /ond-execute  →  /ond-review  →  commit
```

Research answers *"what is this, how does it work today, and what are our options?"*
It stops at a recommendation — it deliberately does not write implementation steps.
Once you've reviewed the findings and are confident in the direction, run `/ond-plan` to
turn it into a step-by-step plan in `Docs/plans/`. The planner reads matching research
documents automatically.

## Naming

`YYYY-MM-DD-<short-kebab-slug>.md` — e.g. `2026-08-16-concentration-tracking.md`.

## Status

Each document carries a **Status** field in its header:

- `Research` — findings recorded, no decision made
- `Accepted` — direction agreed; ready for `/ond-plan`
- `Superseded` — replaced by later research (link the newer document)
- `Rejected` — investigated and decided against (keep the file; add a line on why)

Keeping rejected and superseded research is deliberate: it records what was already
investigated so the same ground doesn't get covered twice.
