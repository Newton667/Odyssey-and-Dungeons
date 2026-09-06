// Homebrew utilities — the single door to the `ond-homebrew` localStorage key,
// plus the pure logic the Homebrewer page used to keep inside its component.
//
// Share codes: `btoa`/`atob` are Latin-1 only. The old encoder did
// `btoa(JSON.stringify(data))`, which throws InvalidCharacterError on any
// codepoint above 255 — em dash, curly quotes, bullet and ellipsis are exactly
// what lands in a pasted spell description, so "Copy Share Code" silently did
// nothing for most spells.

/**
 * Encode any JSON-serialisable value as a UTF-8-safe base64 share code.
 * Chunked so a large item does not blow the `String.fromCharCode` argument limit.
 */
export function encodeShareCode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/**
 * Decode a share code. Throws on empty input and on malformed base64.
 *
 * ORDER IS LOAD-BEARING: UTF-8 first, Latin-1 second. A legacy Latin-1 code
 * containing e.g. `é` (0xE9) is a lone high byte, which `fatal: true` rejects,
 * so it correctly falls through to the Latin-1 branch. A pure-ASCII code decodes
 * identically either way. Reversing the order would mojibake every new code.
 */
export function decodeShareCode(code) {
  const clean = String(code || '').replace(/\s+/g, '');
  if (!clean) throw new Error('Empty share code');
  const bin = atob(clean);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return JSON.parse(bin); // legacy Latin-1 btoa codes
  }
}

// ---------------------------------------------------------------------------
// The storage door.
//
// TWO read functions, and the split is a safety property, not a style choice:
//   readHomebrewRaw() — MUTATION path. No normalization, no dropping.
//   readHomebrew()    — CONSUMPTION path. Normalizes; drops what it cannot read.
//
// Every mutation rewrites the whole array, so a null-dropping read on a write
// path is a silent delete. `save`, `deleteItem`, `doImport` and Duplicate must
// all read raw, touch only the targeted record, and pass everything else through.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'ond-homebrew';

export const HOMEBREW_TYPES = ['weapon', 'armor', 'item', 'ammo', 'spell'];

export const WEAPON_SUBS = ['Simple Melee', 'Simple Ranged', 'Martial Melee', 'Martial Ranged'];
export const ARMOR_SUBS = ['Light', 'Medium', 'Heavy', 'Shield'];
export const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];

const COMMON = ['type', 'name', 'description', 'rarity', 'createdBy', 'homebrew'];
const EQUIP = ['category', 'subcategory', 'cost', 'weight', 'magical', 'attunement', 'requiresAttunement', 'bonus'];

export const TYPE_FIELDS = {
  weapon: [...COMMON, ...EQUIP, 'damage', 'damageType', 'properties', 'mastery', 'ammoType'],
  armor: [...COMMON, ...EQUIP, 'ac', 'strReq', 'stealthDisadvantage'],
  item: [...COMMON, ...EQUIP],
  ammo: [...COMMON, ...EQUIP, 'ammoType', 'stackSize', 'damage', 'damageType'],
  spell: [...COMMON, 'level', 'school', 'castingTime', 'range', 'components', 'materialComponent',
    'duration', 'concentration', 'ritual', 'classes', 'attackType', 'savingThrow', 'saveEffect',
    'damage', 'damageType', 'higherLevels', 'scaling', 'aoe', 'aoeShape', 'aoeSize',
    // Read by CharacterSheet.jsx's spell side panel. The form has no control for it, but an
    // imported share code can carry it — without this, pruneToType drops it on first re-save.
    'aoeDetails'],
};

const META_FIELDS = ['_id', 'createdAt', 'updatedAt'];

/** MUTATION path. Never normalizes, never drops. */
export function readHomebrewRaw() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

/** CONSUMPTION path. Normalizes; records it cannot understand are hidden, not deleted. */
export function readHomebrew(opts = {}) {
  let out = readHomebrewRaw().map(normalizeHomebrewItem).filter(Boolean);
  if (opts.type) out = out.filter(i => i.type === opts.type);
  if (opts.notType) out = out.filter(i => i.type !== opts.notType);
  return out;
}

/** Returns false on quota failure so callers can tell the user. Never throws. */
export function writeHomebrew(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); return true; }
  catch { return false; }
}

// --- array-level mutations: pure, so the preservation property is testable ---

/** Edit in place by `_id` when `editingId` matches, else append. Input untouched. */
export function upsertHomebrewRecord(all, record, editingId) {
  const list = Array.isArray(all) ? [...all] : [];
  if (editingId) {
    const idx = list.findIndex(i => i && i._id === editingId);
    if (idx >= 0) {
      const merged = { ...record, _id: editingId };
      if (merged.createdAt === undefined && list[idx] && list[idx].createdAt !== undefined) {
        merged.createdAt = list[idx].createdAt;
      }
      list[idx] = merged;
      return list;
    }
  }
  list.push(record);
  return list;
}

/** Drop one record by `_id`. Everything else — including unrecognised records — survives. */
export function removeHomebrewRecord(all, id) {
  const list = Array.isArray(all) ? all : [];
  return list.filter(i => !i || i._id !== id);
}

/** Append an imported record. Input untouched. */
export function appendImportedRecord(all, record) {
  const list = Array.isArray(all) ? [...all] : [];
  list.push(record);
  return list;
}

// --- normalization -----------------------------------------------------------

/** Entries may be strings or `{name, ...}` objects from old saves. */
const toStrArray = (v) => {
  if (v === null || v === undefined) return [];
  if (typeof v === 'string') return v ? [v] : [];
  if (!Array.isArray(v)) return [];
  return v.map(x => (typeof x === 'string' ? x : (x?.name ?? String(x)))).filter(Boolean);
};

// parseInt, NOT Number, and never a falsy fallback: Number('') is 0 but
// parseInt('', 10) is NaN, and only the latter tells "blank" from "zero".
const num = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
};

/**
 * Tolerant, never throws. Returns null for anything that is not a usable record.
 * Keys are NOT pruned — normalization is read-side and stays lossless.
 */
export function normalizeHomebrewItem(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!HOMEBREW_TYPES.includes(raw.type)) return null;
  if (typeof raw.name !== 'string' || !raw.name.trim()) return null;

  const attunement = !!(raw.attunement ?? raw.requiresAttunement);
  return {
    ...raw,
    properties: toStrArray(raw.properties),
    components: toStrArray(raw.components),
    classes: toStrArray(raw.classes),
    attunement,
    requiresAttunement: attunement,
    damageType: typeof raw.damageType === 'string' ? raw.damageType.toLowerCase() : (raw.damageType ?? ''),
    bonus: num(raw.bonus, 0),
    level: num(raw.level, 0),
    strReq: num(raw.strReq, 0),
    stackSize: num(raw.stackSize, 20),
    aoeSize: num(raw.aoeSize, 0),
    ac: num(raw.ac, ''),          // blank AC must stay blank; validateHomebrew rejects it
    homebrew: true,
  };
}

/**
 * Keep only the fields the item's own type uses, plus the metadata keys.
 * Runs on every save, so a type switch actually cleans up.
 * `requiresAttunement` is deliberately in EQUIP and is mirrored from `attunement`,
 * so the legacy downgrade path survives a re-save.
 */
export function pruneToType(item) {
  if (!item || typeof item !== 'object') return {};
  const allowed = TYPE_FIELDS[item.type];
  if (!allowed) return {};
  const out = {};
  for (const k of [...allowed, ...META_FIELDS]) {
    if (item[k] !== undefined) out[k] = item[k];
  }
  if (allowed.includes('attunement')) {
    const att = !!(item.attunement ?? item.requiresAttunement);
    out.attunement = att;
    out.requiresAttunement = att;
  }
  return out;
}

// --- attunement alias --------------------------------------------------------
// Attunement lives under two keys: `attunement` (canonical, matches equipment.json) and
// `requiresAttunement` (legacy, still written so a downgrade doesn't lose the flag).
// pruneToType resolves `attunement ?? requiresAttunement`, and normalizeHomebrewItem puts
// `attunement` on EVERY record — so a control bound to `requiresAttunement` alone is INERT
// when editing a saved item: the stale `attunement` always wins the `??`. Read and write BOTH.
export const attunementChecked = (form) => !!(form?.attunement ?? form?.requiresAttunement);
export const setAttunement = (f, on) => { f('attunement', on); f('requiresAttunement', on); };

// --- validation --------------------------------------------------------------

const hasDamage = (d) => typeof d === 'string' && /\d+d\d+|\d/.test(d);

/**
 * Blocking rules exist only where the character sheet mis-computes without them.
 * Everything else is a warning.
 */
export function validateHomebrew(item) {
  const errors = {};
  const warnings = {};
  const it = item || {};

  if (typeof it.name !== 'string' || !it.name.trim()) errors.name = 'Name is required';

  if (it.type === 'weapon') {
    if (!WEAPON_SUBS.includes(it.subcategory)) errors.subcategory = 'Weapon category is required';
    if (!hasDamage(it.damage)) errors.damage = 'Damage formula is required';
    if (!it.damageType) errors.damageType = 'Damage type is required';
  } else if (it.type === 'armor') {
    // An empty armor type falls through to the generic branch on the sheet, which
    // adds DEX — including to heavy armor, which never adds DEX.
    if (!ARMOR_SUBS.includes(it.subcategory)) errors.subcategory = 'Armor type is required';
    const ac = parseInt(it.ac, 10);
    const max = it.subcategory === 'Shield' ? 5 : 30;
    // Sanity bound, not a RAW ceiling — it catches a blank or a typo before
    // calcAC hits isNaN and silently skips the armor.
    if (Number.isNaN(ac) || ac < 1 || ac > max) {
      errors.ac = it.subcategory === 'Shield' ? 'Shield AC must be 1-5' : 'Base AC is required (1-30)';
    }
  } else if (it.type === 'ammo') {
    if (!it.ammoType) errors.ammoType = 'Ammo type is required';
  } else if (it.type === 'spell') {
    const lvl = parseInt(it.level, 10);
    if (Number.isNaN(lvl) || lvl < 0 || lvl > 9) errors.level = 'Spell level must be 0-9';
    if (!SCHOOLS.includes(it.school)) errors.school = 'School is required';
    if (it.scaling && !(lvl > 0)) errors.scaling = 'Only levelled spells can have upcast scaling';
    if (toStrArray(it.components).includes('M') && !String(it.materialComponent || '').trim()) {
      warnings.materialComponent = 'Material component text is usually worth filling in';
    }
  }

  return { ok: Object.keys(errors).length === 0, errors, warnings };
}

// --- ammunition --------------------------------------------------------------

/**
 * How many rounds a stack of this ammo starts with.
 *
 * Precedence:
 *   1. a `(N)` group in the item NAME — this is how equipment.json ships ammo
 *      ("Arrows (20)"), so it must win;
 *   2. `item.stackSize`, when it parses to a positive integer (legacy records
 *      hold a number, but a hand-edited or imported one may hold a string);
 *   3. 20.
 */
export function defaultAmmoCount(name, item) {
  const m = name?.match(/\((\d+)\)/);
  if (m) return parseInt(m[1], 10);
  const stack = parseInt(item?.stackSize, 10);
  if (!Number.isNaN(stack) && stack > 0) return stack;
  return 20;
}

// --- weapon properties -------------------------------------------------------
//
// "Range" is NOT a weapon property. PHB p.147 uses it as the glossary heading
// explaining the (x/y) parenthetical; range lives inside Ammunition (x/y) and
// Thrown (x/y). Existing saves that contain "Range" still round-trip — the
// normalizer keeps unknown property strings verbatim and parseProperty passes
// them through.

export const WEAPON_PROPERTIES = [
  'Ammunition', 'Finesse', 'Heavy', 'Light', 'Loading', 'Reach', 'Special', 'Thrown', 'Two-Handed', 'Versatile',
];

/** Properties that carry a parenthetical. `die` for Versatile, `normal`/`long` for the others. */
export const PARAM_PROPERTIES = { Versatile: 'die', Thrown: 'range', Ammunition: 'range' };

/**
 * Serialise a picker selection into the exact string `equipment.json` stores —
 * lowercase and parenthesised — because that is what the character sheet parses
 * (`CharacterSheet.jsx` looks for `\d+d\d+` inside the versatile property, and
 * `weaponRangeText` returns the thrown/ammunition string verbatim).
 */
export function serializeProperty(name, params = {}) {
  const base = String(name || '').toLowerCase();
  const kind = PARAM_PROPERTIES[name];
  if (kind === 'die' && params?.die) return `${base} (${params.die})`;
  if (kind === 'range' && params?.normal != null && params?.long != null) {
    return `${base} (${params.normal}/${params.long})`;
  }
  return base;
}

const PROP_BY_LOWER = new Map(WEAPON_PROPERTIES.map(p => [p.toLowerCase(), p]));

/**
 * Parse a stored property string back into `{ name, params }` so the picker can
 * round-trip an existing item into its controls on edit. An unrecognised string
 * is returned with its stored casing and empty params — it backs the read-only
 * chip, and must never throw or vanish.
 */
export function parseProperty(str) {
  const raw = String(str ?? '').trim();
  const m = raw.match(/^([^(]+?)\s*\(([^)]*)\)\s*$/);
  const head = (m ? m[1] : raw).trim();
  const name = PROP_BY_LOWER.get(head.toLowerCase()) || head;
  if (!m) return { name, params: {} };
  const inner = m[2].trim();
  const kind = PARAM_PROPERTIES[name];
  if (kind === 'die' && /^\d+d\d+$/.test(inner)) return { name, params: { die: inner } };
  if (kind === 'range') {
    const r = inner.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (r) return { name, params: { normal: parseInt(r[1], 10), long: parseInt(r[2], 10) } };
  }
  return { name, params: {} };
}

// --- form state --------------------------------------------------------------

/** The `category` the Homebrewer stores for each type. Consumers key on these. */
export const categoryForType = (type) => (type === 'spell' ? '' : type === 'ammo' ? 'ammo' : type);

/**
 * Switching the type button must not carry the old type's data across.
 * Fields not used by the new type are reset to their `emptyForm` values —
 * NOT dropped, because the form reads `form.properties.includes(...)` unguarded.
 * `type`, `category`, `name`, `description` and `rarity` survive on purpose.
 */
export function resetFormForType(prevForm, type, emptyForm) {
  const keep = TYPE_FIELDS[type] || [];
  const out = { ...emptyForm };
  for (const k of Object.keys(prevForm || {})) {
    if (keep.includes(k) || !(k in emptyForm)) out[k] = prevForm[k];
  }
  out.type = type;
  out.category = categoryForType(type);
  out.name = prevForm?.name ?? emptyForm.name;
  out.description = prevForm?.description ?? emptyForm.description;
  out.rarity = prevForm?.rarity ?? emptyForm.rarity;
  return out;
}

// --- category filtering ------------------------------------------------------

// Homebrew writes `category: 'item'` / `'ammo'`, but both browsers' dropdowns
// offer 'adventuring-gear' / 'tool' / 'pack', so the plain
// `i.category === cat || i.type === cat` test can never match and homebrew gear
// vanishes under the "Gear" filter. Do NOT fix this by changing what
// Homebrew.jsx writes — CharacterSheet keys ammo/armor/weapon detection on it.
export const HB_CATEGORY_ALIASES = { item: ['adventuring-gear', 'tool', 'pack'], ammo: ['adventuring-gear'] };

export const matchesEquipCategory = (item, cat) =>
  !cat || item.category === cat || item.type === cat || (HB_CATEGORY_ALIASES[item.type] || []).includes(cat);

const MAX_IMPORT_BYTES = 64 * 1024;

/**
 * Gate for pasted share codes. Returns `{ ok: true, item }` or `{ ok: false, error }`.
 * Hostile extra keys are dropped by pruneToType, not stored.
 */
export function sanitizeImported(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'Share code did not contain a homebrew item.' };
  }
  let size = 0;
  try { size = JSON.stringify(data).length; } catch { size = MAX_IMPORT_BYTES + 1; }
  if (size > MAX_IMPORT_BYTES) return { ok: false, error: 'That share code is too large to import.' };
  if (!HOMEBREW_TYPES.includes(data.type)) {
    return { ok: false, error: 'Share code did not contain a homebrew item.' };
  }
  const item = normalizeHomebrewItem(pruneToType(data));
  if (!item) return { ok: false, error: 'Share code did not contain a homebrew item.' };
  // Field-level validation is a WARNING here, never a block. validateHomebrew encodes what a
  // *newly created* item needs; an imported record is somebody else's existing data, and may
  // predate a rule (e.g. a spell saved before `school` was required). Refusing it would make
  // perfectly good shared content unusable, which is worse than importing something incomplete
  // — the recipient can fix the missing field in the editor. Everything above this line IS a
  // hard block: those are structural or hostile inputs, not merely incomplete ones.
  const { ok, errors } = validateHomebrew(item);
  return { ok: true, item, warnings: ok ? null : errors };
}
