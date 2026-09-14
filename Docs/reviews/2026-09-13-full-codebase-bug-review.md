# Review: full-codebase bug hunt of v1.8.0, and the fix batch that followed

**Date:** 2026-09-13
**Scope:** (1) every source file at v1.8.0 (`4e85ffb`) — character sheet, creator, editor + persistence, shared utils/components/contexts, secondary pages, server/scripts/launchers, plus two D&D rules audits; (2) the resulting working-tree diff (40+ files)
**Plan:** n/a (bug-fix batch driven by this review)
**Agents:** reviewer ×7 + DNDAuditor ×2 (codebase pass); reviewer + DNDAuditor (diff pass); main session verified every HIGH against the code
**Verdict:** clean with minor fixes — every HIGH and MEDIUM finding from both passes is fixed; remaining items are listed under "Not addressed"

## Verification

- `cd client && npm test` — 199 passed (143 at v1.8.0; 56 new regression tests in `localDataService`, `multiclass`, `levelChoices`, `featureUses`, `dndHelpers`, `diceFormula`)
- `npx vite build` — clean
- `node --test scripts/ensure-deps.test.js` — 8 passed; `node --check` on every server file; `bash -n start.sh`
- A scratch undeclared-identifier scan (Babel scope analysis) over all client source — none (the build does not catch these)
- Headless browser smoke test (throwaway profile, scratch Vite server): 31/31 checks, 0 exceptions, 0 console errors. The checks cover:
  - all sheet tabs
  - a level-up on a character with a stale one-element `classes` array (level 9, `classes` dropped, +8 current and max HP, one hit die added)
  - a long rest regaining half the hit dice
  - a short rest at full HP
  - Monk AC 15 and +6 / 1d6 unarmed strike
  - no spell DC for a 2014 level-1 Paladin
  - Jack of All Trades on a Bard's passive score
  - a legacy ASI key moved to its card
  - the editor, the creator, and the Spells, Homebrew, Settings and Campaigns pages
  - an Equipment search for `+1`
  - two 3D dice rolls with a live WebGL context
- Server fixes verified with curl against throwaway servers (traversal → 400, malformed config POST → 400 with the server staying up, cross-origin write → 403, a failed URI leaves `.env` byte-identical); update logic against scratch git repositories

## Findings — codebase pass (v1.8.0)

### HIGH — all FIXED
- **[FIXED · reviewer]** `localDataService.js` + `server/routes/{spells,equipment}.js` — search built `new RegExp(userText)`; `+`/`(` crashed the page (and flipped DB mode to Local).
- **[FIXED · reviewer]** `server/routes/characters.js` — path traversal through `:id` (`..%2F..`) read/overwrote/deleted arbitrary `.json` files.
- **[FIXED · reviewer]** `server/server.js` — `POST /api/config/database` with a non-string `mongoUri` crashed the process (async throw outside `try`).
- **[FIXED · reviewer]** `CharacterSheet.jsx` `applyLevelUp` + `multiclass.getCharClasses` — a one-element `classes` array froze class/level/subclass; editor level/class/subclass changes were ignored.
- **[FIXED · reviewer]** `CharacterSheet.jsx` Progression — picks stored under the current level, not the card's; cross-level fallback undid other levels' ASIs; re-clicking re-applied an ASI.
- **[FIXED · reviewer]** `CharacterSheet.jsx` — short-rest modal closed mid-roll → `prev.rolls` on null → whole-app crash.
- **[FIXED · reviewer]** `CharacterSheet.jsx` — multiclassing hid the first class's saved picks; re-picking doubled an ASI.
- **[FIXED · reviewer]** `CharacterSheet.jsx` Actions tab / side panel — spell attack/DC used INT for every caster (`spellcastingAbility` is never saved by the creator).
- **[FIXED · reviewer]** `CharacterCreate.jsx` — Paladin/Ranger spell list never loaded (effect keyed on `cls` only).
- **[FIXED · reviewer]** `CharacterEdit.jsx` — portrait upload stored `/uploads/…`, broken under the launchers (Vite proxies only `/api`).
- **[FIXED · reviewer]** `CampaignView.jsx` — non-ok responses stored as the campaign → crash on the poll.
- **[FIXED · reviewer]** `Dice3D.jsx` / `App.jsx` — a throwing `WebGLRenderer` (no WebGL) unmounted the whole app; `ErrorBoundary` sat inside `DiceProvider`.
- **[FIXED · reviewer]** `Dice3D.jsx` — d100 only produced multiples of 10.
- **[FIXED · DNDAuditor]** `calcAC` — Barbarian/Monk Unarmored Defense missing (and overwrote the creator's correct AC).
- **[FIXED · DNDAuditor]** Actions tab — Monk unarmed strikes/monk weapons never used DEX; die keyed on total level.
- **[FIXED · DNDAuditor]** Progression ASI picker — local `FEAT_ASI` copy always gave the first ability; Resilient never granted its save.
- **[FIXED · DNDAuditor]** `getSpellcastingClasses` — 2014 level-1 Paladin/Ranger got a spell DC and prepared spells.

### MEDIUM — all FIXED
Sheet:
- Hit-die/level-up HP used base CON.
- Passive scores ignored expertise.
- Short rest refused at full HP with no dice.
- Milestone characters had no Level Up entry.
- Cancel mid-roll still levelled.
- Tough skipped on level-up.
- Homebrew armor `bonus` was ignored.
- Reducing columns hid widgets.
- Components defined inside render (`RollBtn`/`ProfDot`/`SkillRow`/`SaveRow`/`SpellCard`).
- Ammo selection wasn't required to be equipped, and used-up stacks kept a 0 count.
- Name-based ammo detection matched non-ammunition items.
- Progression handlers crashed on object `features`.
- Expertise cards had no options.
- Hit-die labels disagreed with the rolls.

Creator:
- Stale picks were saved.
- Skill picks overlapped skills granted elsewhere.
- The fighting-style picker was unreachable for Paladin/Ranger, and `fightingStyle` wasn't saved.
- Blank or duplicate multiclass rows inflated the level.
- Raw number inputs.

Editor:
- The Gold field did nothing on the sheet.
- `trackAmmo` wasn't loaded.
- The ability-method tabs reset untouched scores.
- Multiclass spell limits used the wrong class and level.
- Save built on the stale snapshot.
- A failed local write still showed "Saved!".

Pages:
- Settings data source had no re-render.
- A bad DB URI destroyed the working one.
- "+ Add Spell" failed in Local mode.
- No Paladin spell filter.
- Campaign create failed silently.
- Homebrew test roll showed `− NaN`.
- A cantrip couldn't lose its upcast scaling.
- `NumInput` Enter saved the stale value.

Utils:
- Dice animation loops and GPU resources leaked.
- `getLevelChoices` ignored the ruleset.
- Feature uses ignored `abilityBonuses`.

Server/launchers:
- Cross-site writes were possible (open `cors()`).
- Update check treated ahead as behind, then ran `reset --hard`.
- `pull-update` swallowed install failures.
- Mongo routes hung 10 s without a DB.
- `.env` `$` corruption.
- Seed scripts deleted each other's data.
- `*.sh`/`*.desktop` weren't pinned to LF.

Rules:
- Long rest refilled all hit dice.
- Jack of All Trades not wired.
- Weapon Mastery only checked the primary class.
- Multiclass prerequisites ignored current classes.
- Wild Shape wasn't unlimited at 20.
- Monk `Martial Arts (d6)` label missing.

## Findings — diff pass (the fixes themselves)

### HIGH
- **[FIXED · reviewer · verified in browser]** `Dice3D.jsx` cleanup — the new `renderer.forceContextLoss()` killed the canvas's context under StrictMode's dev remount, so every roll fell back to no animation for launcher users. Reproduced headless ("Context Lost" → `reading 'precision'`), removed, re-verified live context on two rolls.
- **[FIXED · DNDAuditor]** `martialArtsDie` — no ruleset branch; 2024 Monks rolled the 2014 dice. Now d6/d8/d10/d12 under 2024 (tests added).

### MEDIUM
- **[FIXED · reviewer]** `CharacterSheet.jsx` Progression — removing the cross-level fallback made old picks (stored under the wrong key) look unchosen; re-picking would double an ASI. New `relocateOrphanedChoices` repairs them once on load (7 tests; browser-verified).
- **[FIXED · DNDAuditor]** `featureUses.js` — 2024 Wild Shape uses (2 / 3 at 6 / 4 at 17, not unlimited at 20).

### LOW
- **[FIXED · reviewer]** Ability picker showed STR + save for a legacy Resilient pick (the undo uses CON) — now shows CON.
- **[FIXED · reviewer]** Editor Lv Up HP came from the open-time snapshot — now a pending gain applied to the current local HP at save.
- **[FIXED · reviewer]** Dead `levelUpOpenRef` removed (Cancel/Confirm are disabled while the HP die rolls).
- **[FIXED · reviewer]** Creator rolled-HP field converted to `NumInput` (0 = average).
- **[FIXED · reviewer]** Deselecting on an Expertise card no longer removes a skill another level's card still lists.
- **[FIXED · DNDAuditor]** Resilient save removal now keeps saves granted by any of the character's classes.

## Verified correct
- Every fix in the diff pass was traced by the reviewer. The details:
  - one-element `classes` handling, including every old writer
  - `migrateSingleClassChoices`
  - `asiChoiceEffect` parity with the removed table
  - SheetCtx values in scope, hooks before early returns, no TDZ in dependency arrays
  - the ammo detection scope
  - AC: homebrew-only bonus, Unarmored Defense gated on no armor
  - the spell-cap condition and Magic Initiate interplay
  - `trimSpellPicks` against the creator's own fields
  - `NumInput` callers
  - seed deletes scoped by name
  - DB URI tested before `.env` is written
  - update logic: 409 unless strictly behind; `start.sh`/`start.bat` fall through correctly
- DNDAuditor confirmed these against the PHB:
  - long-rest half hit dice (p.186)
  - level-up HP and hit-die changes
  - Unarmored Defense (p.48, p.78)
  - Jack of All Trades level
  - Paladin/Ranger Spellcasting start (p.84)
  - multiclass prerequisites (p.163)
  - ruleset-aware subclass timing
  - feature-use modifiers
  - creator caps
  - d100

## Not addressed
- **Single-class Eldritch Knight / Arcane Trickster spellcasting** (DNDAuditor HIGH, codebase pass). This was never implemented. It needs third-caster tables and sheet/creator/editor wiring: a feature for its own plan, not a regression.
- **Per-die hit-dice pools for multiclass short rests** (DNDAuditor MEDIUM). A Fighter 5 / Wizard 3 can spend eight d10s. Fixing it needs `hitDiceRemaining` per die type, a data-model change.
- **Server hardening beyond this batch.**
  - The same-site guard doesn't stop DNS rebinding.
  - `cors()` still lets other sites *read* GET responses.
  - `pull-update` still discards uncommitted working-tree edits, though it now refuses when commits would be lost.
  - These are consistent with the documented "no authentication, trusted network" design.
- **`start.bat` update logic** was only exercised under Wine. It needs a real Windows run.
- **2024 details with no current practical effect.**
  - The monk-weapon definition (every Light martial melee weapon in the data is also Finesse).
  - `CLASS_LEVELS` Martial Arts labels are the 2014 dice.
  - The 2024 Wild Shape short-rest recovery of one use is modelled as a full reset.
- **Codebase-pass LOW polish left as-is.**
  - Creator: the subrace isn't required, and armor state is unused.
  - Sheet: Cast can't pick a higher slot for non-damage spells, legacy `gold` conversion, the spell-browser debounce on clear, and right-click attacks don't spend ammo.
  - Campaigns: the roll-log `since` clock skew, and a concurrency edge past 200 rolls.
  - Server: `upload-data` isn't atomic.
  - Dice and components: the d10 face doesn't match the value, d2/d3 faces, ImageCropper's error handling and passive wheel listener, and Home not showing the update `note`.
- **Two-tab editing:** fields the editor form owns (for example `equipment`) still win over sheet changes made in another tab.
