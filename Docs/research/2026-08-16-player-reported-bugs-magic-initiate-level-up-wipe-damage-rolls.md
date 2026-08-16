# Player-Reported Bugs: Magic Initiate, Level-Up Data Wipe, Damage Rolls, Text Overflow

**Status:** Accepted — implemented
**Created:** 2026-08-16
**Plan:** [`Docs/plans/2026-08-16-player-reported-bug-fixes.md`](../plans/2026-08-16-player-reported-bug-fixes.md) (execution log: [`Docs/increments/2026-08-16-player-reported-bug-fixes.md`](../increments/2026-08-16-player-reported-bug-fixes.md))
**Question:** What is actually causing the five bugs the players reported — Magic Initiate not offering cross-class cantrips, ammo replenishing itself after a level-up, inventory becoming unequipped after a level-up, damage rolls "interacting" with the previous roll / dropping their modifiers, and long text widening the screen instead of wrapping into a paragraph?

## Summary

These five reports resolve to **four independent root causes**, and two of them (ammo
replenishing, inventory unequipped) are the *same* bug with the same fix.

1. **Magic Initiate** — the sheet correctly raises the cantrip/spell *cap* for the feat
   (`CharacterSheet.jsx:2212`) but the spell browser that populates the list still filters
   every result down to the **primary class's** spell list (`CharacterSheet.jsx:227-231`).
   A Paladin has no cantrips on its list, so the cap is 2 and the list is empty. Same
   restriction in the editor (`CharacterEdit.jsx:250-254`). Only the **creator** has a
   proper Magic Initiate class picker (`CharacterCreate.jsx:391-396`).
2. **Ammo replenishing + inventory unequipped** — one root cause, and I have empirical
   proof on disk. The character sheet runs with server sync **disabled**
   (`CharacterSheet.jsx:78`), so `equippedItems`, `ammo`, `usedSpellSlots`, `featureUses`,
   `conditions` and the multiclass `classes` array are written **only** to localStorage.
   The editor's save and the sheet's HP box both write to the **server**, which stamps a
   fresh `updatedAt` (`server/routes/characters.js:81`). On the next sheet load,
   `useCharacterSync.js:104-107` sees the server as newer and **overwrites the local copy
   with the stale server copy**, deleting every sheet-only field. `char.ammo` disappearing
   makes `defaultAmmoCount()` hand back a full quiver (`CharacterSheet.jsx:112-115, 1837`);
   `char.equippedItems` disappearing unequips everything. The one server character file in
   the repo is missing all of those keys, confirming the mechanism.
3. **Damage rolls** — three separate defects: magic weapons **double-count their `+N`**
   because the data has it in *both* `damage: "1d8+1"` and `bonus: 1`
   (`equipment.json`, `CharacterSheet.jsx:1861,1864`); weapons whose `damage` isn't dice
   notation (Blowgun `"1"`, Net `"—"`) make `rollDice3D` bail out and return **total 0**
   (`DiceContext.jsx:88-90`); and the dice provider keeps the pending resolver and the
   static modifier in **single-slot refs** (`DiceContext.jsx:101-102`) with no re-entrancy
   guard and no disabled state on the roll buttons, so a second roll started before the
   first settles silently discards the first roll and leaves the previous number showing.
4. **Text widening the screen** — structural, not verified against a specific screenshot.
   The sheet's column grid and its action/spell tables use bare `1fr` tracks
   (`CharacterSheet.jsx:840, 1810`), which is `minmax(auto, 1fr)` and therefore cannot
   shrink below content min-width; several row cells also lack `minWidth: 0`
   (e.g. `CharacterSheet.jsx:2089`), and there is no global `overflow-wrap` rule in
   `index.css`.

**Recommendation (judgment):** fix #2 first — it is silent data loss affecting every
character, not just an annoyance — then #3's data/parse defects, then #1, then #4.

## Current state

### Local-first storage and the sync design

`CharacterSheet` deliberately runs the storage hook with sync off:

- `client/src/pages/CharacterSheet.jsx:78` — `useCharacter(id, { syncEnabled: false })`
- `client/src/hooks/useCharacterSync.js:43` — `syncToServer` early-returns when sync is
  disabled, so `updateChar`/`updateField` never reach the server.

But two paths still write to the server:

- `client/src/hooks/useCharacterSync.js:145,153` — `updateHp()` PATCHes
  `/api/characters/:id/hp` **unconditionally**, ignoring `syncEnabled`. Called from the
  sheet's HP +/- box at `client/src/pages/CharacterSheet.jsx:349`.
- `client/src/pages/CharacterEdit.jsx:395,403` — the editor writes the merged local copy,
  then PUTs `body` (the form only) for any non-`local-` id.

`Docs/known-patterns-and-gotchas.md:102` already flags the `updateHp` PATCH as odd, and
documents the editor's `{...char, ...body}` merge — but it does **not** record the
consequence documented below.

### Magic Initiate today

- `client/src/utils/dndConstants.js:68` — the feat exists in `FEATS`, description only.
- `client/src/pages/CharacterCreate.jsx:391-396, 2042-2088` — the creator has a working
  picker: choose one of Bard/Cleric/Druid/Sorcerer/Warlock/Wizard, then 2 cantrips + 1
  first-level spell from that list, merged into `preparedSpells`
  (`CharacterCreate.jsx:478`).
- `client/src/pages/CharacterSheet.jsx:2212` — the sheet raises `cantripLimit += 2` and
  `leveledLimit += 1` when the feat is present.
- `client/src/pages/CharacterEdit.jsx:1300-1356` — the editor has an "Override — add any
  spell" toggle that ignores class list and limits. This is the current workaround, and
  `CHANGELOG.md` (v1.4.0) explicitly says so: *"(In the editor, use the 'add any spell'
  override.)"*

So the feat is half-wired: the counter knows about it, the pickers don't.

## Findings

### 1. Magic Initiate — the browser filters to the primary class

`client/src/pages/CharacterSheet.jsx:227-231`:

```js
// Filter by class if character has a class
if (char?.class) {
  const cls = char.class.toLowerCase();
  filtered = filtered.filter(s => !s.classes?.length || s.classes.some(c => c.toLowerCase() === cls));
}
```

Three things follow:

- A Paladin sees only Paladin-list spells. Paladins have **no cantrips** in either edition
  (`Docs/known-patterns-and-gotchas.md:162`), so with Magic Initiate the counter reads
  `0/2` and the list is empty — exactly the report.
- The effect's dependency array (`CharacterSheet.jsx:234`) is `char?.class`, so
  **multiclass characters** also can't browse their second class's list. That is a latent
  bug the players haven't hit yet.
- The editor is the same story via a different route: `allSpells` is loaded as
  `queryLocalSpells({ cls: form.class })` (`CharacterEdit.jsx:253`), and
  `getSpellLimits` returns `cantrips: 0` for Paladin (`CharacterEdit.jsx:65`), so the
  Cantrips section doesn't render at all.

The rule, precisely — **5e (2014)**, PHB p.168: *Magic Initiate* — choose a class from
**bard, cleric, druid, sorcerer, warlock, or wizard**; learn two cantrips of your choice
from that class's list, plus one 1st-level spell from that same list, castable at its
lowest level once per long rest. Spellcasting ability is CHA for bard/sorcerer/warlock,
WIS for cleric/druid, INT for wizard. **Paladin is not one of the six choices** — so a
Paladin taking the feat *must* pick another class's list, which is the case the app blocks.

**5.5e (2024) difference:** Magic Initiate became a **repeatable Origin feat** with the
list restricted to **Cleric, Druid, or Wizard** (not the six 2014 classes). The level-1
spell is *always prepared*, castable once per Long Rest without a slot **or** with any slot
you have; the spellcasting ability is INT, WIS or CHA, chosen when you take the feat; you
may swap the level-1 spell when you gain a level; retaking it requires a different list
([D&D Beyond](https://www.dndbeyond.com/feats/1789162-magic-initiate),
[dnd2024.wikidot](http://dnd2024.wikidot.com/feat:magic-initiate)). The app currently
implements the 2014 version only, and does not branch on `char.ruleset` for this feat.

Note the player's phrasing — "the entire list of cantrips" — is not what either edition
grants. The correct fix is "cantrips from a chosen class's list", not "all cantrips".

### 2. Ammo replenishing and inventory unequipping are the same bug

Which fields live only on the client:

| Field | Written by | In the editor's save body? |
|---|---|---|
| `equippedItems` | sheet (`updateField`) | no |
| `ammo` | sheet (`updateField`, `CharacterSheet.jsx:1875-1882`) | no |
| `usedSpellSlots`, `featureUses`, `activeBuffs`, `conditions`, `hitDiceRemaining` | sheet | no |
| `classes` (multiclass array) | sheet level-up (`CharacterSheet.jsx:453-499`) | no |

The editor's form (`CharacterEdit.jsx:130-177`) never reads any of them, so its PUT body
never contains them.

The clobber, in order:

1. Sheet edits go to localStorage only — sync is off (`useCharacterSync.js:43`).
2. Player levels up in the editor. `save()` writes the merged local copy
   (`CharacterEdit.jsx:395`, which *does* preserve the fields), then PUTs the form-only
   body (`CharacterEdit.jsx:403`).
3. The server merges into **its own stale record** and stamps a new timestamp:
   `const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() }`
   (`server/routes/characters.js:81`). `existing` never had `equippedItems`/`ammo`.
4. Next sheet load: `useCharacterSync.js:101-107` compares timestamps, sees
   `serverTime > localTime` (the server stamped after the local write), and runs
   `setChar(server); writeLocal(server)` — **the local copy is replaced**.
5. `char.ammo` is now undefined, so `char.ammo?.[name] ?? defaultAmmoCount(name)`
   (`CharacterSheet.jsx:1837`) falls back to the count parsed out of the item name —
   `Arrows (20)` → 20 (`CharacterSheet.jsx:112-115`). Self-replenishing arrows.
6. `char.equippedItems` is now undefined, so `equippedWeapons`, `equippedAmmo`
   (`CharacterSheet.jsx:1805, 1834`) and the AC calc all see nothing. Inventory unequipped.

**Empirical confirmation.** The one server-side character in the repo,
`server/data/characters/d48bed3c-33cc-4e54-88e3-954eae949912.json`, has keys:
`_id, name, race, class, subclass, level, background, alignment, ruleset, faith, languages,
abilityScores, skillProficiencies, savingThrowProficiencies, maxHp, currentHp, armorClass,
speed, hitDice, proficiencyBonus, notes, levelingMethod, experiencePoints, traits, ideals,
bonds, flaws, age, height, weight, eyes, hair, skin, feats, toolProficiencies, avatarUrl,
equipment, preparedSpells, createdAt, updatedAt, skillExpertise, acBonus, acOverride,
initiativeBonus, abilityBonuses, gold, currency, spellcastingAbility, features`

— i.e. **exactly the editor's form fields**, and **no** `equippedItems`, `ammo`,
`usedSpellSlots`, `featureUses`, `conditions`, `hitDiceRemaining`, `activeBuffs`,
`levelChoices` or `classes`. Its `updatedAt` (2026-08-09) is a month after its
`createdAt`, so it has been PUT at least once.

**Second, more frequent trigger.** `updateHp` PATCHes the server on *every* HP change
(`useCharacterSync.js:145-158`) regardless of `syncEnabled`, and the PATCH handler also
stamps `updatedAt` (`server/routes/characters.js:93`). So taking damage in the sheet is
enough to make the server copy "newer". The players may be blaming level-up because that's
when the loss is most visible, but the same wipe can fire after any HP adjustment plus a
page reload.

**Blast radius beyond the two reports:** a multiclass character would lose its `classes`
array (falling back to single-class primary — see
`Docs/known-patterns-and-gotchas.md:171`), spell slots and feature uses would silently
refill, and active conditions/buffs would clear. Worth checking with the players whether
they have seen those too — it would confirm the diagnosis.

### 3. Damage rolls

**(a) Magic weapons double-count their `+N`.** Verified in `client/src/data/equipment.json`:
`+1 Longsword` is `{ damage: "1d8+1", bonus: 1, properties: ["versatile (1d10+1)"] }`.
The sheet then does:

```js
const dmgBonus = abilityMod + (wpn.bonus || 0) + ammoBonus + duelingBonus;   // :1861
const dmgFormula = wpn.damage ? `${wpn.damage}+${dmgBonus}${riderDamageSuffix}` : null;  // :1864
```

so a STR+3 Paladin with a +1 Longsword gets the formula `1d8+1+4` = **die + 5** where the
correct answer is die + 4. `rollDice3D` sums *all* static modifiers by design
(`DiceContext.jsx:72-77`), so both `+1` and `+4` land. Note the **2H button is correct** —
`versatileDie` deliberately strips the `+1` out of `"versatile (1d10+1)"`
(`CharacterSheet.jsx:1849-1853`, and `Docs/known-patterns-and-gotchas.md:165`), so 1H and
2H disagree by 1 on the same weapon. All 20+ `+1/+2/+3` weapons plus Vorpal Sword, Holy
Avenger and Defender carry the bonus in both places. Attack rolls are fine — `hitBonus`
(`:1860`) doesn't read the damage string.

**(b) Some weapons roll a flat 0.** `rollDice3D` requires a `\d+d\d+` group; with none it
returns `{ results: [], total: 0 }` (`DiceContext.jsx:88-90`). `Blowgun` has
`damage: "1"` and `Net` has `damage: "—"`, so their damage buttons produce `0` and no
modifier is applied at all — a literal match for "damage modifiers are not applied". Any
homebrew weapon with a non-dice damage string behaves the same way.

**(c) Advantage/disadvantage drops a negative modifier.** `doAdvantage`/`doDisadvantage`
parse the bonus with `formula.match(/1d20([+-]\d+)/)` (`CharacterSheet.jsx:523, 535`). A
negative total bonus renders as `1d20+-2`, which that regex does **not** match, so
`bonus` falls back to `0` and the modifier vanishes. Rare, but real (low STR + no
proficiency).

**(d) Concurrent rolls silently eat each other.** `DiceContext` stores the pending
`resolve` and the static bonus in **single-slot refs**:

```js
bonusRef.current = staticBonus;   // :101
resolveRef.current = resolve;     // :102
```

and `rollDice3D` calls `clearFadeTimers()` (`:94`) which cancels the 500 ms timer that
`onDiceSettled` uses to deliver the result (`:107-109`). Combined with `Dice3D`'s unmount
cleanup cancelling its animation frame and 6 s safety timeout
(`Dice3D.jsx:526-528`), starting a second roll before the first has settled-and-delivered
means the first promise **never resolves**. `doRollWithResult` awaits forever, so it never
calls `setRollResults` or `logRoll` — the button keeps showing whatever number was there
from an earlier roll (results persist for 8 s, `CharacterSheet.jsx:513-516`). To a player
that reads as "the damage roll used the previous roll's number".

Nothing guards against this: `RollBtn` (`CharacterSheet.jsx:859`) has no `disabled` state
and ignores the `rolling` flag the context already exposes (`DiceContext.jsx:132`).
Separately, `RollBtn` is defined **inside** the `CharacterSheet` component body, which is
the exact pattern `Docs/known-patterns-and-gotchas.md:5-12` forbids — harmless for a
button today, but it means every roll button remounts on every state change.

I could **not** find a code path where two rolls' numbers are arithmetically added
together. The observable "add or subtract from each other" is, as far as I can verify,
the stale-value + dropped-promise behaviour above plus the `+N` double-count in (a). If a
player can reproduce an actual sum of two rolls, that would change the picture.

**(e) Shared labels.** `rollResults` is keyed by label (`CharacterSheet.jsx:512`). Two
copies of the same weapon, or the same weapon shown in both the Actions tab and the side
panel, share one entry — rolling one updates the other's displayed number. Another
plausible source of "rolls interacting".

### 4. Text widening the screen

Nothing here is confirmed against a specific screen; these are the structural causes that
exist in the code.

- `CharacterSheet.jsx:840` — the main layout is
  `gridTemplateColumns: '${sidebarWidth}px 1fr'` (or `1fr 1fr` / `1fr 1fr 1fr`). A bare
  `1fr` is `minmax(auto, 1fr)`, so the track cannot shrink below its content's min-content
  width and the sheet grows past its `maxWidth: '1400px'` container
  (`CharacterSheet.jsx:832`). The canonical fix is `minmax(0, 1fr)`.
- `CharacterSheet.jsx:1810, 1895, 1982, 2022, 2085` — the action/spell tables use
  `'2fr 1fr 1fr 1.5fr'` with the same problem, and the first cell of a spell row
  (`CharacterSheet.jsx:2089`) has no `minWidth: 0`, so a long spell name plus the upcast
  `<select>` pushes the track wide.
- `client/src/index.css` has no global `overflow-wrap` / `word-break` rule, and no
  `overflow-x` containment on `.page` (`index.css:218-222`) or the sheet wrapper.
- For contrast, the places that got this right: `CharacterSheet.jsx:2146-2147` (Actions-tab
  feature description) uses `minWidth: 0` + `textOverflow: 'ellipsis'`, and the side panel
  uses `whiteSpace: 'pre-wrap'` in a fixed-width panel (`CharacterSheet.jsx:3676`).

Which of these is *the* bug depends on the tab and the content the player was looking at.

## Options

These are largely independent; the options below are per-bug where there's a real choice.

### Magic Initiate

**Option A — Data-driven feat spell-list grants.**
Store the chosen class on the character (e.g. `char.featSpellLists = { 'Magic Initiate': 'Cleric' }`)
and have the sheet's and editor's browsers union that list into the allowed classes,
alongside `getCharClasses(char)` for multiclass.
- *Pros:* fixes multiclass browsing at the same time; matches the project's
  "extend a data-driven map, don't special-case" habit (`FEAT_EFFECTS`, `FEATURE_USES`);
  keeps the cap logic that already exists at `CharacterSheet.jsx:2212` honest; leaves room
  for the 2024 repeatable variant and for other list-granting feats (Ritual Caster).
- *Cons:* needs a new persisted field, a picker UI in two places, and back-compat for
  characters created before it existed (the creator stores the picked spells but not the
  chosen class).
- *Effort:* **M** — one new field, one small picker, two browser filters.
- *Fit:* strong. This is the shape the codebase already uses for feats.

**Option B — Drop the class filter from the sheet's browser entirely, keep the caps.**
Let the sheet browse all spells; the counters already enforce how many you may have.
- *Pros:* smallest possible change; also unblocks multiclass, racial and item-granted
  spells; the editor already has exactly this behaviour behind the override toggle
  (`CharacterEdit.jsx:1300-1356`), so there's precedent.
- *Cons:* loses the guard rail — a Wizard could quietly add Cure Wounds. Doesn't record
  *why* the character has a cross-list cantrip.
- *Effort:* **S**.
- *Fit:* fine, but it trades correctness for convenience.

**Option C — Mirror the creator's picker onto the sheet/editor.**
Reuse the `miClass` / `miCantrips` / `miSpell` flow from `CharacterCreate.jsx:2042-2088`.
- *Pros:* consistent UX with creation; enforces exactly 2+1.
- *Cons:* duplicates a chunk of UI in a third place; does nothing for multiclass.
- *Effort:* **M**.
- *Fit:* moderate — three parallel copies of spell logic is already called out as a trap
  (`Docs/known-patterns-and-gotchas.md:161-162`); adding a fourth is going the wrong way.

### The level-up data wipe

**Option A — Make the server copy authoritative-complete.**
Have the editor include the sheet-only fields in its PUT body, and stop `updateHp` from
PATCHing while sync is disabled.
- *Pros:* keeps the server backup meaningful; small, targeted.
- *Cons:* the editor's `char` snapshot is taken at page load, so if the sheet is open in
  another tab the PUT can still push stale `ammo`. Any *future* sheet-only field
  reintroduces the bug — this is a whack-a-mole fix.
- *Effort:* **S**.
- *Fit:* moderate.

**Option B — Make localStorage authoritative and never let the server overwrite it.**
Remove the `serverTime > localTime → writeLocal(server)` branch
(`useCharacterSync.js:104-107`) when sync is disabled; use the server purely to *discover*
characters that have no local copy at all (which `useCharacterSync.js:96-99` already does).
Gate `updateHp`'s PATCH on `syncEnabledRef` like `syncToServer` does.
- *Pros:* matches the documented design — "Characters are local only (no sync toggle)"
  (`CLAUDE.md:28`) and "localStorage is the master copy" (`useCharacterSync.js:9-12`,
  `CharacterEdit.jsx:194-197`). Removes the whole class of bug rather than one instance.
  No new fields to maintain.
- *Cons:* a character edited on another device/browser will no longer pull down. Given the
  app is single-machine local-first, that's mostly theoretical. Users who *have* already
  been clobbered aren't recovered by this — their data is gone.
- *Effort:* **S–M** — the code change is small; deciding the exact policy and writing the
  gotcha entry is the real work.
- *Fit:* strong. It makes the code match the stated architecture.

**Option C — Field-level merge instead of whole-document replace.**
On load, merge server and local per field, preferring local for sheet-owned keys.
- *Pros:* keeps two-way sync alive; safest for a future multi-device story.
- *Cons:* needs an explicit ownership table for every field and a real conflict policy;
  easy to get subtly wrong; substantially more code for a feature that's currently off.
- *Effort:* **L**.
- *Fit:* weak right now — sync is disabled app-wide, so this buys nothing today.

### Damage rolls

**Option A — Fix the data + the parse, leave the concurrency alone.**
Strip the embedded `+N` from magic-weapon `damage` strings in `equipment.json` (the `bonus`
field already carries it), and make `rollDice3D` handle non-dice damage (`"1"`, `"—"`).
- *Pros:* deterministic, fully testable, fixes the numbers players can see; `dndHelpers.test.js`
  already exists as a home for parse tests.
- *Cons:* editing seeded JSON means the equivalent server seed
  (`server/seed-magic-items.js`) has to move in lockstep, or DB-mode users still see the
  old numbers. Doesn't address "interacted with the previous roll".
- *Effort:* **S–M**.
- *Fit:* strong; data-driven, matches the project's habits.

**Option B — Sanitise at read time instead of in the data.**
Parse the weapon's damage die out of the string and ignore any trailing `+N` when
`wpn.bonus` is set — the same approach already used for `versatile (1d10+1)`
(`CharacterSheet.jsx:1849-1853`).
- *Pros:* one place to change; immune to bad data from homebrew and from DB mode; there's
  already precedent in the file.
- *Cons:* the *displayed* formula still needs the same treatment or the label and the roll
  disagree; leaves the underlying data inconsistent.
- *Effort:* **S**.
- *Fit:* strong — it's literally the existing pattern for the same class of bad string.

**Option C — Add a roll queue / re-entrancy guard to `DiceContext`.**
Either serialise rolls (queue) or reject a new roll while one is in flight, and expose
`rolling` to `RollBtn` so buttons disable themselves.
- *Pros:* removes the dropped-promise class of bug; makes every roll deliver a result.
- *Cons:* a queue changes the feel of the app (clicks stack up); a hard reject can feel
  unresponsive. Needs a decision on which.
- *Effort:* **M**.
- *Fit:* good; the context already tracks `rolling` and just doesn't use it defensively.

### Text overflow

**Option A — `minmax(0, 1fr)` on the grid tracks + `minWidth: 0` on the flex/grid cells
that lack it, plus a global `overflow-wrap: anywhere` for description text.**
- *Pros:* addresses the structural cause everywhere at once; cheap; low risk.
- *Cons:* without a reproduction I can't confirm it fixes the exact screen the player saw.
- *Effort:* **S**.
- *Fit:* strong.

**Option B — Get a screenshot / repro first, then fix the one spot.**
- *Pros:* guarantees the right fix.
- *Cons:* blocks on the players.
- *Effort:* **S**, but gated.

## Recommendation

*(This section is my judgment, not verified fact.)*

**Priority order: the data wipe, then the damage numbers, then Magic Initiate, then layout.**
The wipe is silent data loss that hits every character and every field the sheet owns —
the two reported symptoms are just the visible tip. The others are wrong numbers and
missing options, annoying but not destructive.

- **Wipe → Option B** (localStorage authoritative; drop the server-newer overwrite when
  sync is disabled, and gate `updateHp`'s PATCH). `CLAUDE.md:28` already declares
  characters local-only and the hook's own comments call localStorage the master copy; the
  overwrite branch is a leftover from a sync mode that is switched off everywhere. Option A
  only patches the current field list and will regress the first time someone adds a new
  sheet-only field. I'd change my mind if there's an intent to re-enable server sync soon —
  then Option C's field-ownership table becomes worth the cost.
- **Damage → Option B for the `+N`, plus the non-dice guard from Option A.** Read-time
  sanitising is immune to homebrew and DB-mode data, and it's the pattern already used for
  versatile properties two lines away. Add **Option C**'s re-entrancy guard as a separate,
  smaller piece — reject-while-rolling is simpler than a queue and matches what the
  DiceRoller panel already does locally (`DiceRoller.jsx:36`).
- **Magic Initiate → Option A.** Storing the chosen list on the character is the only
  option that also fixes multiclass browsing, and it's the shape the codebase already uses
  for feat wiring (`Docs/known-patterns-and-gotchas.md:150`). If the goal is just to unblock
  the player this week, Option B is a one-line change that costs a guard rail — acceptable
  as a stopgap, not as the answer.
- **Layout → Option A**, but ask the players which tab it happens on before committing.

## Risks & unknowns

- **The wipe fix does not recover already-lost data.** Any character that has been
  clobbered has lost its `equippedItems`, `ammo`, `usedSpellSlots`, `featureUses` and —
  if multiclass — its `classes` array. Those will have to be re-entered by hand. Worth
  telling the players up front.
- I verified the clobber mechanism by code reading plus the field list of the one server
  character file on disk. I did **not** reproduce it live in a browser. A quick manual
  repro (equip an item, level up in the editor, reload the sheet) would confirm it before
  any code is touched.
- I could not find a code path that arithmetically combines two rolls' totals. If the
  players can reproduce an actual sum, there's a fifth defect I haven't found.
- Editing `equipment.json` damage strings would desync from `server/seed-magic-items.js`
  unless both change; DB-mode users read the server copy.
- The text-overflow diagnosis is structural inference, not a confirmed reproduction.
- `RollBtn` being defined inside `CharacterSheet` (`CharacterSheet.jsx:859`) violates
  `Docs/known-patterns-and-gotchas.md:5-12`. It isn't causing any of the reported bugs, but
  it's a latent trap worth noting wherever this work lands.

## Open questions

1. **Where do the players level up — the sheet's Level Up modal or the editor's "Lv Up"?**
   The sheet's `applyLevelUp` (`CharacterSheet.jsx:453-499`) never touches the server, so
   only the editor path triggers the wipe. Confirming this pins the diagnosis.
2. **Have they also seen spell slots or feature uses refill, conditions clear, or a
   multiclass character revert to one class?** All three follow from the same wipe; a yes
   is strong confirmation.
3. **Should Magic Initiate follow 2014 or 2024 rules for characters with
   `ruleset: '2024'`?** The lists differ (six classes vs Cleric/Druid/Wizard) and 2024
   makes the feat repeatable. Current code implements 2014 for everyone.
4. **Which tab/screen shows the text-overflow problem?** A screenshot would turn a
   structural guess into a one-line fix.
5. **For concurrent rolls: queue them, or ignore clicks while dice are in the air?**

## Sources

- Code: `client/src/pages/CharacterSheet.jsx:227-231` — spell browser filters results to
  `char.class` only; `:234` — effect deps confirm primary class only.
- Code: `client/src/pages/CharacterSheet.jsx:2212` — Magic Initiate raises the cantrip and
  spell caps but nothing widens the list.
- Code: `client/src/pages/CharacterSheet.jsx:78` — sheet runs with `syncEnabled: false`;
  `:349` — HP box calls `updateHp`.
- Code: `client/src/pages/CharacterSheet.jsx:112-115, 1834, 1837` — ammo count falls back to
  the count parsed from the item name when `char.ammo` is absent.
- Code: `client/src/pages/CharacterSheet.jsx:1805, 1860-1864` — equipped weapons, hit bonus,
  damage bonus and the damage formula that double-counts `wpn.bonus`.
- Code: `client/src/pages/CharacterSheet.jsx:453-499` — the sheet's `applyLevelUp` writes
  locally only and does not touch equipment or ammo.
- Code: `client/src/pages/CharacterSheet.jsx:503-519, 523, 535, 859` — `doRollWithResult`,
  the advantage/disadvantage bonus regex, and `RollBtn` with no rolling guard.
- Code: `client/src/pages/CharacterSheet.jsx:832, 840, 1810, 2089` — `maxWidth: 1400px`
  wrapper, bare `1fr` grid tracks, table cell without `minWidth: 0`.
- Code: `client/src/pages/CharacterEdit.jsx:130-177` — form fields loaded (no
  `equippedItems`/`ammo`); `:248-255` — `allSpells` scoped to `form.class`; `:48-75` —
  `getSpellLimits` gives Paladin `cantrips: 0`; `:395,403` — local merge then server PUT;
  `:1300-1356` — the existing "add any spell" override.
- Code: `client/src/pages/CharacterCreate.jsx:391-396, 478, 2042-2088` — the working Magic
  Initiate class picker at creation.
- Code: `client/src/hooks/useCharacterSync.js:43` — sync gate; `:101-107` — server-newer
  branch overwrites the local copy; `:145-158` — `updateHp` PATCHes regardless of the gate.
- Code: `client/src/context/DiceContext.jsx:62-90` — formula parsing, non-dice early return
  with `total: 0`; `:94, 101-102, 107-109` — `clearFadeTimers`, single-slot `bonusRef` /
  `resolveRef`, and the 500 ms delivery timer.
- Code: `client/src/components/Dice3D.jsx:526-528` — unmount cancels the animation frame
  and the 6 s safety timeout.
- Code: `client/src/components/DiceRoller.jsx:36` — the standalone roller already guards
  with `if (rolling) return`.
- Code: `server/routes/characters.js:81, 93` — PUT and PATCH both stamp a fresh `updatedAt`
  on a merge into the stale server record.
- Code: `server/data/characters/d48bed3c-33cc-4e54-88e3-954eae949912.json` — real server
  copy containing only the editor's form fields; no `equippedItems`, `ammo`,
  `usedSpellSlots`, `featureUses`, `conditions` or `classes`.
- Code: `client/src/data/equipment.json` — `+1 Longsword` `{damage:"1d8+1", bonus:1}`,
  `Blowgun` `{damage:"1"}`, `Net` `{damage:"—"}`, `Arrows (20)` ammunition.
- Code: `client/src/data/localDataService.js:13-25` — `queryLocalSpells` `cls` filter.
- Code: `client/src/index.css:218-222, 265-302` — `.page` rules, tooltip box; no global
  `overflow-wrap` rule anywhere.
- Code: `client/src/utils/dndConstants.js:68` — Magic Initiate description entry.
- Docs: `Docs/known-patterns-and-gotchas.md:5-12` (components in render), `:102`
  (editor merge + unconditional HP PATCH), `:150` (feats are descriptive until wired),
  `:161-165` (three parallel spell-limit spots; versatile parsing), `:171-180` (multiclass
  `classes` array).
- Docs: `CLAUDE.md:28` — "Characters are local only (no sync toggle)".
- Docs: `CHANGELOG.md` v1.4.0 — Magic Initiate shipped creator-only, with the editor
  override named as the workaround.
- Books: Player's Handbook (2014), p.168 — Magic Initiate: choose bard, cleric, druid,
  sorcerer, warlock or wizard; two cantrips plus one 1st-level spell from that list, cast
  once per long rest; spellcasting ability by chosen class.
- Web: [Magic Initiate — D&D Beyond (2024)](https://www.dndbeyond.com/feats/1789162-magic-initiate)
  — 2024 version is a repeatable Origin feat limited to the Cleric, Druid or Wizard list,
  spell always prepared, ability chosen from INT/WIS/CHA.
- Web: [Magic Initiate — D&D 5e (2024) wikidot](http://dnd2024.wikidot.com/feat:magic-initiate)
  — corroborates the repeatable/different-list rule and level-up spell swap.


---

## Decisions (confirmed with the user, 2026-08-16)

These answer the Open questions above and are binding on the plan.

### 1. Level-up path — **both**
Players use whichever they find, so the fix must cover the editor's "Lv Up" **and** the
sheet's Level Up modal, plus the ungated HP `PATCH`. Don't scope the fix to one path.

### 2. Blast radius — **verified in code: wider than reported**
The user hadn't noticed slots/uses/multiclass breaking, and asked for this to be checked
rather than assumed. It was, and **every sheet-owned field is vulnerable** — the players
simply haven't hit the visible cases yet.

Mechanism, confirmed end to end:

1. `CharacterEdit.jsx` builds `body` from the form, writes
   `merged = {...char, ...body}` to **localStorage** (sheet-owned fields survive here), but
   `PUT`s only **`body`** to the server — see the save function's `body` / `merged` split.
2. The server file therefore never receives the sheet-owned fields, and its `updatedAt`
   becomes newer than the local copy's.
3. On next load `useCharacterSync.js` hits `serverTime > localTime` → `writeLocal(server)`
   → **localStorage is overwritten with the copy that lacks those fields.**

Grepped against the editor's form and save body — none of these are carried, so all are
lost on that overwrite:

| Field | Player-visible symptom |
|---|---|
| `ammo` | **arrows refill** (reported) |
| `equippedItems` | **gear unequips** (reported) |
| `usedSpellSlots` | spell slots refill |
| `featureUses` | Rage / Lay on Hands / Second Wind counters reset |
| `classes` | multiclass character reverts to single class |
| `attunedItems` | attunement lost |
| `activeConditions`, `activeBuffs` | conditions and Hunter's Mark-style buffs drop |
| `deathSaveSuccesses` / `deathSaveFailures` | death saves reset |
| `hitDiceRemaining` | hit dice refill |
| `temporaryHp` | temp HP lost |

Only characters with a server copy are affected — `local-` ids never sync. **Fix this
first**; it is silent data loss, not a cosmetic bug.

### 3. Magic Initiate — **follow `char.ruleset`**
- `'2014'`: pick from Bard / Cleric / Druid / Sorcerer / Warlock / Wizard.
- `'2024'`: revised version — Cleric / Druid / Wizard, spell always prepared, repeatable.

Store the chosen class list on the character so the sheet's browser can filter by it
instead of the primary class. Consistent with how the rest of the app routes edition
behaviour through `char.ruleset`.

### 4. Text overflow — **rework sheet-wide, not per-tab**
Reported across the Actions tab, Spells tab, Features/Progression tab **and** the side
panel. Per-tab patches are explicitly rejected: apply a structural fix so no character
sheet view can widen the page — `minmax(0, 1fr)` on grid tracks, `min-width: 0` on flex
children, wrapping/`overflow-wrap` on long description text, and `overflow-x: auto` on
anything genuinely wide (tables, code-ish blocks). Verify every tab afterwards.

### 5. Already-clobbered characters
Not recoverable — the overwritten data is gone. Affected characters need re-entering by
hand. The plan should not attempt a migration; it should stop the bleeding.
