# Review — Homebrewer Review and Refinement

**Date:** 2026-09-06
**Plan:** `Docs/plans/2026-09-06-homebrewer-review-and-refinement.md`
**Increments:** `Docs/increments/2026-09-06-homebrewer-review-and-refinement.md` (9/9 done)
**Agents:** `ond-reviewer` + `ond-dnd-auditor`, run in parallel over the working-tree diff
**Suite at review time:** 132 passed · build clean

## Verdict

**Ship-ready after the fixes below were applied.** One HIGH, one MEDIUM and four LOW findings;
all fixed in-session and re-verified. The D&D audit returned **zero** HIGH or MEDIUM findings —
every rules claim from the plan survived into the code intact.

Final state: **135 passed (135)**, `✓ built in 2.46s`, no CRLF, `version.js` untouched at `v1.5.3`.

---

## HIGH — the Attunement checkbox was inert on every edit · CONFIRMED · FIXED

`Homebrew.jsx:533/615/674` bound all three Attunement checkboxes to `form.requiresAttunement`,
but `pruneToType` resolves `!!(item.attunement ?? item.requiresAttunement)` and
`normalizeHomebrewItem` writes `attunement` onto **every** record. `startEdit` spreads a
normalized item, so `form.attunement` is always present and always wins the `??`.

Verified by tracing the real expressions:

```
stored attuned, user UNTICKS -> true   (want false)
stored plain,   user TICKS   -> false  (want true)
brand new item               -> true   (want true)   ← only this case worked
```

Inert in both directions; `??` only falls through on null/undefined, so a stored `false`
still wins. Increment 3 had just made attunement user-visible on the Equipment page, so the
bug was newly surfaced rather than dormant.

**Fix:** extracted `attunementChecked(form)` / `setAttunement(f, on)` into
`utils/homebrew.js` — read canonical-first, write **both** keys — and rebound all three
checkboxes. Added `attunement: false` to `EMPTY_FORM` so a fresh form and an edited form
have the same shape. Three regression tests added, including the disagreement case
(`{attunement: true, requiresAttunement: false}`) that the original test suite never
exercised — which is precisely why this shipped past nine green increments.

Recorded as a new entry in `known-patterns-and-gotchas.md`: **a two-key alias makes a
control inert unless it writes both keys.**

## MEDIUM — a failed Duplicate looked successful · CONFIRMED · FIXED

`duplicateItem` and `deleteItem` discarded `writeHomebrew`'s boolean, so at storage quota the
list silently re-rendered unchanged — the same silent no-op this work fixed for `save`, and
the changelog claim "a failed homebrew save no longer looks like a successful one" was only
two-thirds true. Added a page-level `storageError` (the form-level `formErrors` is the wrong
channel — Duplicate and Delete run outside the form). All four mutation paths now report failure.

## LOW — all fixed

| Finding | Fix |
|---|---|
| `aoeDetails` read by `CharacterSheet.jsx:3691` but absent from `TYPE_FIELDS.spell`, so `pruneToType` dropped it on first re-save of an imported spell | added to the spell field list |
| `shareError` is page-level; a failure on item A rendered under item B after collapsing | cleared in the expand handler |
| `{form.damage !== undefined && …}` always true — `EMPTY_FORM.damage` is `''` | dead guard removed |
| Increment doc claimed no stock weapon has a non-physical damage type; **Sunblade** is `radiant` | doc note corrected |

---

## D&D rules audit — clean

Zero HIGH, zero MEDIUM. Re-ran the suite and every `rg` gate in the plan independently.

**Cantrip scaling verified end to end** — the highest-risk change in the plan:

```
Fire Bolt         lvl 1/4/5/10/11/16/17/20 → 1d10 1d10 2d10 2d10 3d10 3d10 4d10 4d10
Eldritch Blast    lvl 17 → 1d10   excluded: scales by BEAMS, not dice
Green-Flame Blade lvl 17 → 1d8    excluded: stored 1d8 is already the 5th-level value
Booming Blade     lvl 17 → 4d8    correctly NOT excluded: its 1d8 is movement damage
Dragonborn breath lvl 17 → 2d6    source:'race', own 1/6/11/16 tiers
```

Booming Blade and Green-Flame Blade are indistinguishable in `spells.json` — both level 0,
both `1d8`, both `source: 'class'` — yet one must scale and the other must not. Excluding
both would have been as wrong as excluding neither.

Also confirmed: `char.level` is total level for multiclass; ammo dice route through
`weaponDamageDice` so magical ammo's `+N` is not double-counted; the 10-property list matches
PHB p.147/149 with `Range` correctly absent and `Special` correctly present; `weaponRangeText`
now yields Longbow 150/600, Sling 30/120, Heavy Crossbow 100/400; heavy armor adds no DEX and
the subcategory requirement closes the old fallback for new saves; the mastery badge now gates
on `char.ruleset === '2024'`.

### Accepted limitations (not defects)

- **Reach weapons still display `5 ft.` instead of `10 ft.`** — pre-existing; `weaponRangeText`
  branches only on `isRanged`. Not part of the claimed fix. Follow-up.
- **A no-damage weapon can't be saved.** `validateHomebrew` requires a digit, so a homebrew
  Net — the one vanilla weapon dealing no damage — is blocked. Typing `0` passes but renders a
  `0+STR` button. Deliberate tradeoff from the plan ("dead damage button otherwise").
- **The armor DEX fallback at `CharacterSheet.jsx:670-673` still exists** for records saved
  *before* this fix. Validation closes it for new saves only — unavoidable for a read-side
  migration, and the correct choice given live player data.

---

## Corrections to the reviewers

- **`ond-reviewer` reported the repo is uniformly CRLF** and treated that as the baseline.
  It is not — verified `CR=0` across every touched and new file; they are pure LF. The
  conclusion (not a defect) was harmless, but the fact was wrong.
- **Two earlier planner claims were false and were caught before implementation:**
  `scaling: "None"` does not exist in `spells.json` (measured: `''` ×382, absent ×68, dice
  ×71, `"None"` ×0 — it is an `<option>` label), and homebrew was *not* absent from the
  Spells and Equipment pages.

## Not verified

The manual UI gates were not run — this was a headless session. Every one is backed by a
pure-function assertion or a grep, but no browser exercised the Homebrewer form, the
Equipment page renders, or the character-sheet spell cards.
