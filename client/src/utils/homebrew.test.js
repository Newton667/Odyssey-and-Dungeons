import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  encodeShareCode, decodeShareCode,
  readHomebrew, readHomebrewRaw, writeHomebrew,
  upsertHomebrewRecord, removeHomebrewRecord, appendImportedRecord,
  normalizeHomebrewItem, pruneToType, validateHomebrew, sanitizeImported,
  attunementChecked, setAttunement,
  matchesEquipCategory, resetFormForType,
  serializeProperty, parseProperty, defaultAmmoCount,
} from './homebrew';

// Homebrew share codes. The old implementation was `btoa(JSON.stringify(data))`,
// which throws InvalidCharacterError on any codepoint above 255 — em dash, curly
// quotes, bullet and ellipsis are exactly what lands in a pasted spell description.
// The decode order (UTF-8 first, Latin-1 second) is load-bearing: reversing it
// silently mojibakes every newly generated code.

describe('encodeShareCode / decodeShareCode', () => {
  it('(a) round-trips a spell whose description carries codepoints above 255', () => {
    const spell = {
      type: 'spell',
      name: 'Ashen Rebuke',
      level: 3,
      school: 'Evocation',
      damage: '2d6',
      damageType: 'fire',
      description: 'Deals 2d6 — “half” on a save • see ‘below’ … 3 × per day.',
      classes: ['Sorcerer', 'Wizard'],
    };
    expect(decodeShareCode(encodeShareCode(spell))).toEqual(spell);
  });

  it('(b) round-trips an em dash on a freshly generated code (decode-order guard)', () => {
    expect(decodeShareCode(encodeShareCode({ description: '—' })).description).toBe('—');
  });

  it('(c) decodes a legacy Latin-1 btoa code', () => {
    const legacy = btoa(JSON.stringify({ name: 'Café', type: 'spell' }));
    expect(decodeShareCode(legacy)).toEqual({ name: 'Café', type: 'spell' });
  });

  it('(d) decodes a code built the server way (Buffer → base64, already UTF-8)', () => {
    const o = { type: 'spell', name: 'Ashen Rebuke — Greater', description: '“quoted” • …' };
    const serverCode = Buffer.from(JSON.stringify(o)).toString('base64');
    expect(decodeShareCode(serverCode)).toEqual(o);
  });

  it('(e) throws on a string that is not valid base64', () => {
    expect(() => decodeShareCode('not base64!!')).toThrow();
  });

  it('(f) tolerates whitespace and newlines spliced into a pasted code', () => {
    const code = encodeShareCode({ type: 'spell', name: 'Ashen Rebuke', description: 'a — b' });
    const mid = Math.floor(code.length / 2);
    const messy = `  ${code.slice(0, mid)}\n  ${code.slice(mid)}\n`;
    expect(decodeShareCode(messy)).toEqual(decodeShareCode(code));
  });

  it('throws on an empty or null code', () => {
    expect(() => decodeShareCode('')).toThrow();
    expect(() => decodeShareCode(null)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Increment 2 — the storage door.
//
// The safety property under test: every mutation path reads the RAW array, so a
// record the normalizer cannot understand is hidden from consumers but is never
// written out of existence. These assertions are on the PURE functions, never on
// the component — this repo has no jsdom and no testing-library, and vitest runs
// in bare Node.
// ---------------------------------------------------------------------------

describe('upsert / remove / append — unrecognised records survive (the B1 guard)', () => {
  const build = () => [
    { type: 'monster', name: 'Beholder' },
    { _id: 'a', type: 'weapon', name: 'Axe' },
  ];

  it('upsert edits in place and passes the unknown record through', () => {
    const all = build();
    const out = upsertHomebrewRecord(all, { _id: 'a', type: 'weapon', name: 'Great Axe' }, 'a');
    expect(out).toHaveLength(2);
    expect(out).toContainEqual({ type: 'monster', name: 'Beholder' });
    expect(out.find(i => i._id === 'a').name).toBe('Great Axe');
    expect(all).toHaveLength(2);
    expect(all.find(i => i._id === 'a').name).toBe('Axe');   // input not mutated
  });

  it('upsert appends when there is no editing id', () => {
    const all = build();
    const out = upsertHomebrewRecord(all, { _id: 'c', type: 'spell', name: 'Zap' }, null);
    expect(out).toHaveLength(3);
    expect(out).toContainEqual({ type: 'monster', name: 'Beholder' });
    expect(all).toHaveLength(2);
  });

  it('remove drops only the targeted id and passes the unknown record through', () => {
    const all = build();
    const out = removeHomebrewRecord(all, 'a');
    expect(out).toHaveLength(1);
    expect(out).toContainEqual({ type: 'monster', name: 'Beholder' });
    expect(all).toHaveLength(2);
  });

  it('append adds and passes the unknown record through', () => {
    const all = build();
    const out = appendImportedRecord(all, { _id: 'b', type: 'spell', name: 'Bolt' });
    expect(out).toHaveLength(3);
    expect(out).toContainEqual({ type: 'monster', name: 'Beholder' });
    expect(all).toHaveLength(2);
  });
});

describe('normalizeHomebrewItem', () => {
  it('returns null for a record it cannot understand', () => {
    expect(normalizeHomebrewItem({ type: 'monster', name: 'Beholder' })).toBeNull();
    expect(normalizeHomebrewItem({ type: 'weapon', name: '' })).toBeNull();
    expect(normalizeHomebrewItem(null)).toBeNull();
  });

  it('coerces properties/components/classes to string arrays (the old-saves rule)', () => {
    const w = normalizeHomebrewItem({ type: 'weapon', name: 'X', properties: null });
    expect(w.properties).toEqual([]);
    expect(() => w.properties.includes('Heavy')).not.toThrow();
    expect(normalizeHomebrewItem({ type: 'weapon', name: 'X', classes: 'Wizard' }).classes).toEqual(['Wizard']);
    expect(normalizeHomebrewItem({ type: 'weapon', name: 'X', properties: [{ name: 'Heavy' }, 'Light'] }).properties)
      .toEqual(['Heavy', 'Light']);
  });

  it('canonicalises requiresAttunement onto attunement', () => {
    expect(normalizeHomebrewItem({ type: 'item', name: 'X', requiresAttunement: true }).attunement).toBe(true);
    expect(normalizeHomebrewItem({ type: 'item', name: 'X', requiresAttunement: true }).requiresAttunement).toBe(true);
    expect(normalizeHomebrewItem({ type: 'item', name: 'X' }).attunement).toBe(false);
  });

  it('lowercases damageType and flags the record as homebrew', () => {
    const w = normalizeHomebrewItem({ type: 'weapon', name: 'X', damageType: 'Slashing' });
    expect(w.damageType).toBe('slashing');
    expect(w.homebrew).toBe(true);
  });

  it('coerces numbers with parseInt and never a falsy fallback', () => {
    expect(normalizeHomebrewItem({ type: 'armor', name: 'X', strReq: '15' }).strReq).toBe(15);
    expect(normalizeHomebrewItem({ type: 'weapon', name: 'X', bonus: 0 }).bonus).toBe(0);
    expect(normalizeHomebrewItem({ type: 'weapon', name: 'X', bonus: '' }).bonus).toBe(0);
    expect(normalizeHomebrewItem({ type: 'armor', name: 'X', ac: '' }).ac).toBe('');   // NOT 0
    expect(normalizeHomebrewItem({ type: 'spell', name: 'X', aoeSize: '' }).aoeSize).toBe(0);
    expect(normalizeHomebrewItem({ type: 'armor', name: 'X', ac: '18' }).ac).toBe(18);
  });
});

describe('readHomebrew / readHomebrewRaw / writeHomebrew', () => {
  beforeEach(() => {
    let store = {};
    vi.stubGlobal('localStorage', {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; },
      clear: () => { store = {}; },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('has a live localStorage stub (guard — without this the ReferenceError is swallowed)', () => {
    localStorage.setItem('ond-homebrew', JSON.stringify([{ _id: 'a', type: 'weapon', name: 'Axe' }]));
    expect(readHomebrewRaw()).toHaveLength(1);
    expect(readHomebrewRaw()[0].name).toBe('Axe');
  });

  it('hides an unrecognised record from consumers without deleting it', () => {
    localStorage.setItem('ond-homebrew', JSON.stringify([
      { type: 'monster', name: 'Beholder' },
      { _id: 'a', type: 'weapon', name: 'Axe' },
    ]));
    expect(readHomebrew()).toHaveLength(1);
    expect(readHomebrew()[0].name).toBe('Axe');
    expect(readHomebrewRaw()).toHaveLength(2);
  });

  it('filters by type and notType', () => {
    localStorage.setItem('ond-homebrew', JSON.stringify([
      { _id: 'a', type: 'weapon', name: 'Axe' },
      { _id: 'b', type: 'spell', name: 'Bolt' },
    ]));
    expect(readHomebrew({ type: 'spell' }).map(i => i.name)).toEqual(['Bolt']);
    expect(readHomebrew({ notType: 'spell' }).map(i => i.name)).toEqual(['Axe']);
  });

  it('returns [] for unparseable and non-array stored values', () => {
    localStorage.setItem('ond-homebrew', 'not json');
    expect(readHomebrew()).toEqual([]);
    expect(readHomebrewRaw()).toEqual([]);
    localStorage.setItem('ond-homebrew', '{"a":1}');
    expect(readHomebrew()).toEqual([]);
    expect(readHomebrewRaw()).toEqual([]);
  });

  it('writeHomebrew returns true on success and false on a quota failure, never throwing', () => {
    expect(writeHomebrew([{ _id: 'a', type: 'weapon', name: 'Axe' }])).toBe(true);
    expect(readHomebrewRaw()).toHaveLength(1);
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError'); },
    });
    expect(writeHomebrew([{ _id: 'a' }])).toBe(false);
  });
});

describe('pruneToType', () => {
  it('drops the previous type fields when a weapon becomes armor', () => {
    const out = pruneToType({
      _id: 'a', type: 'armor', name: 'Scale', description: 'd',
      damage: '2d6', properties: ['Heavy'], ammoType: 'Bolt', ac: 15, subcategory: 'Medium',
    });
    expect(out.damage).toBeUndefined();
    expect(out.properties).toBeUndefined();
    expect(out.ammoType).toBeUndefined();
    expect(out.ac).toBe(15);
    expect(out._id).toBe('a');
  });

  it('keeps both attunement keys in sync so the legacy downgrade path survives', () => {
    const out = pruneToType({ type: 'item', name: 'X', attunement: true });
    expect(out.attunement).toBe(true);
    expect(out.requiresAttunement).toBe(true);
  });

  // The two keys disagreeing is the state a UI bound to only ONE of them produces.
  // `attunement` wins the `??`, which is why the form must write both.
  it('resolves a disagreement in favour of the canonical `attunement` key', () => {
    expect(pruneToType({ type: 'item', name: 'X', attunement: true, requiresAttunement: false }).attunement).toBe(true);
    expect(pruneToType({ type: 'item', name: 'X', attunement: false, requiresAttunement: true }).attunement).toBe(false);
  });
});

describe('sanitizeImported — blocks structure, warns on content', () => {
  // HARD blocks: structural or hostile input. These are not homebrew items at all.
  it('rejects anything that is not a usable homebrew record', () => {
    expect(sanitizeImported(null).ok).toBe(false);
    expect(sanitizeImported([]).ok).toBe(false);
    expect(sanitizeImported('nope').ok).toBe(false);
    expect(sanitizeImported({ type: 'monster', name: 'Beholder' }).ok).toBe(false);
    expect(sanitizeImported({ type: 'spell' }).ok).toBe(false);            // no name
    expect(sanitizeImported({ type: 'spell', name: 'X', blob: 'z'.repeat(70000) }).ok).toBe(false);
  });

  // Regression, found in live testing: a spell created before `school` was required
  // exported fine but could not be re-imported — "School is required" blocked it.
  // An import is somebody else's EXISTING data; refusing it makes real shared content
  // unusable. Import it, and tell the recipient what to complete.
  it('imports an incomplete but legitimate record, reporting what is missing', () => {
    const r = sanitizeImported({ type: 'spell', name: 'Aura Edge Lv1', level: 0, school: '', damage: '1d8+1', description: 'x' });
    expect(r.ok).toBe(true);
    expect(r.item.name).toBe('Aura Edge Lv1');
    expect(Object.values(r.warnings || {}).join(' ')).toMatch(/School/i);
  });

  it('reports no warnings for a complete record', () => {
    const r = sanitizeImported({ type: 'spell', name: 'Fire Bolt', level: 0, school: 'Evocation', damage: '1d10', description: 'x' });
    expect(r.ok).toBe(true);
    expect(r.warnings).toBeNull();
  });

  it('still strips keys that are not in the type schema', () => {
    const r = sanitizeImported({ type: 'item', name: 'X', description: 'd', evil: '<script>' });
    expect(r.ok).toBe(true);
    expect(r.item.evil).toBeUndefined();
  });
});

describe('attunement alias helpers', () => {
  it('reads the canonical key first, falling back to the legacy one', () => {
    expect(attunementChecked({ attunement: true, requiresAttunement: false })).toBe(true);
    expect(attunementChecked({ attunement: false, requiresAttunement: true })).toBe(false);
    expect(attunementChecked({ requiresAttunement: true })).toBe(true);   // legacy-only record
    expect(attunementChecked({})).toBe(false);
    expect(attunementChecked(undefined)).toBe(false);
  });

  // Regression: binding the checkbox to `requiresAttunement` alone made it inert on edit,
  // because startEdit spreads a normalized item that always carries `attunement`.
  it('writes BOTH keys so an edited item actually changes', () => {
    const written = {};
    setAttunement((k, v) => { written[k] = v; }, false);
    expect(written).toEqual({ attunement: false, requiresAttunement: false });
    setAttunement((k, v) => { written[k] = v; }, true);
    expect(written).toEqual({ attunement: true, requiresAttunement: true });
  });
});

describe('validateHomebrew', () => {
  it('blocks armor with no armor type and armor with no base AC', () => {
    expect(validateHomebrew({ type: 'armor', name: 'X', subcategory: '', ac: 15 }).ok).toBe(false);
    expect(validateHomebrew({ type: 'armor', name: 'X', subcategory: 'Heavy', ac: '' }).ok).toBe(false);
  });

  it('accepts a complete armor', () => {
    expect(validateHomebrew({ type: 'armor', name: 'Dragonscale Plate', subcategory: 'Heavy', ac: 18 }).ok).toBe(true);
  });

  it('blocks a weapon with no subcategory, no damage or no damage type', () => {
    const base = { type: 'weapon', name: 'X', subcategory: 'Martial Melee', damage: '1d10', damageType: 'slashing' };
    expect(validateHomebrew(base).ok).toBe(true);
    expect(validateHomebrew({ ...base, subcategory: '' }).ok).toBe(false);
    expect(validateHomebrew({ ...base, damage: '' }).ok).toBe(false);
    expect(validateHomebrew({ ...base, damageType: '' }).ok).toBe(false);
  });

  it('blocks ammo with no ammo type and spells with a bad level or school', () => {
    expect(validateHomebrew({ type: 'ammo', name: 'X', ammoType: '' }).ok).toBe(false);
    expect(validateHomebrew({ type: 'ammo', name: 'X', ammoType: 'Arrow' }).ok).toBe(true);
    expect(validateHomebrew({ type: 'spell', name: 'X', level: 3, school: '' }).ok).toBe(false);
    expect(validateHomebrew({ type: 'spell', name: 'X', level: 12, school: 'Evocation' }).ok).toBe(false);
    expect(validateHomebrew({ type: 'spell', name: 'X', level: 0, school: 'Evocation', scaling: '1d6' }).ok).toBe(false);
  });

  it('treats an M component with no material text as a warning, not a block', () => {
    const r = validateHomebrew({
      type: 'spell', name: 'X', level: 3, school: 'Evocation',
      components: ['V', 'S', 'M'], materialComponent: '',
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.materialComponent).toBeTruthy();
  });
});

describe('sanitizeImported', () => {
  it('rejects anything that is not a usable homebrew record', () => {
    expect(sanitizeImported([]).ok).toBe(false);
    expect(sanitizeImported(null).ok).toBe(false);
    expect(sanitizeImported({ type: 'monster', name: 'x' }).ok).toBe(false);
    expect(sanitizeImported({
      type: 'spell', name: 'Huge', level: 1, school: 'Evocation', description: 'x'.repeat(100000),
    }).ok).toBe(false);
  });

  it('accepts a valid record and strips hostile extra keys', () => {
    const r = sanitizeImported({
      type: 'spell', name: 'Ashen Rebuke', level: 3, school: 'Evocation',
      description: 'd', properties: null, evil: '<script>',
    });
    expect(r.ok).toBe(true);
    expect(r.item.name).toBe('Ashen Rebuke');
    expect(r.item.evil).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Increment 3 — the category filter, in both browsers.
//
// The expression this replaces is `i.category === cat || i.type === cat`, which
// can never match 'adventuring-gear' / 'tool' / 'pack' for a homebrew item,
// because Homebrew.jsx writes category: 'item' / 'ammo'. That is why homebrew
// gear vanishes under the "Gear" filter today.
// ---------------------------------------------------------------------------

describe('matchesEquipCategory', () => {
  it('matches a homebrew item against the gear-ish categories the dropdowns offer', () => {
    expect(matchesEquipCategory({ type: 'item', category: 'item', name: 'X' }, 'adventuring-gear')).toBe(true);
    expect(matchesEquipCategory({ type: 'item', category: 'item' }, 'tool')).toBe(true);
    expect(matchesEquipCategory({ type: 'item', category: 'item' }, 'pack')).toBe(true);
  });

  it('aliases ammo to adventuring-gear only — the alias table is not a blanket', () => {
    expect(matchesEquipCategory({ type: 'ammo', category: 'ammo' }, 'adventuring-gear')).toBe(true);
    expect(matchesEquipCategory({ type: 'ammo', category: 'ammo' }, 'tool')).toBe(false);
  });

  it('still matches on the plain category/type and never cross-matches weapons', () => {
    expect(matchesEquipCategory({ type: 'weapon', category: 'weapon' }, 'weapon')).toBe(true);
    expect(matchesEquipCategory({ type: 'item', category: 'item' }, 'weapon')).toBe(false);
  });

  it('passes everything through when no filter is selected', () => {
    expect(matchesEquipCategory({ type: 'item', category: 'item' }, '')).toBe(true);
    expect(matchesEquipCategory({ type: 'item', category: 'item' }, undefined)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Increment 4 — switching the type button must not carry the old type's data.
//
// Today setType resets only `category`, so a weapon's damage, properties and
// ammo type all persist onto an armor record and survive every later edit.
// Keys are reset to their EMPTY_FORM values, NOT dropped — the form reads
// `form.properties.includes(...)` unguarded.
// ---------------------------------------------------------------------------

const EMPTY_FORM_FIXTURE = {
  type: 'weapon', name: '', description: '', rarity: 'common', category: 'weapon', subcategory: '',
  cost: '', weight: '', damage: '', damageType: '', properties: [], ac: '', magical: false, bonus: 0,
  ammoType: '', stackSize: 20, requiresAttunement: false,
  stealthDisadvantage: false, strReq: 0,
  level: 0, school: '', castingTime: '1 Action', range: '', components: [], materialComponent: '',
  duration: 'Instantaneous', concentration: false, ritual: false, classes: [],
  attackType: '', savingThrow: '', saveEffect: '', higherLevels: '', scaling: '',
  aoe: false, aoeShape: '', aoeSize: 0,
};

describe('resetFormForType', () => {
  const weaponForm = () => ({
    ...EMPTY_FORM_FIXTURE,
    type: 'weapon', damage: '2d6', properties: ['Heavy', 'Two-Handed'], ammoType: 'Bolt',
    name: 'Storm Axe', description: 'd', rarity: 'rare',
  });

  it('clears the previous type fields but keeps name, description and rarity', () => {
    const out = resetFormForType(weaponForm(), 'armor', EMPTY_FORM_FIXTURE);
    expect(out.damage).toBe('');
    expect(out.properties).toEqual([]);
    expect(out.ammoType).toBe('');
    expect(out.name).toBe('Storm Axe');
    expect(out.description).toBe('d');
    expect(out.rarity).toBe('rare');
  });

  it('keeps every key so unguarded form reads cannot throw', () => {
    const out = resetFormForType(weaponForm(), 'armor', EMPTY_FORM_FIXTURE);
    expect('properties' in out).toBe(true);
    expect(Array.isArray(out.properties)).toBe(true);
    expect(() => out.properties.includes('Heavy')).not.toThrow();
    for (const k of Object.keys(EMPTY_FORM_FIXTURE)) expect(k in out).toBe(true);
  });

  it('sets type and derives category the way the page expects', () => {
    expect(resetFormForType(weaponForm(), 'spell', EMPTY_FORM_FIXTURE).type).toBe('spell');
    expect(resetFormForType(weaponForm(), 'spell', EMPTY_FORM_FIXTURE).category).toBe('');
    expect(resetFormForType(weaponForm(), 'ammo', EMPTY_FORM_FIXTURE).category).toBe('ammo');
    expect(resetFormForType(weaponForm(), 'weapon', EMPTY_FORM_FIXTURE).category).toBe('weapon');
  });

  it('keeps fields the new type also uses — weapon to ammo keeps ammoType', () => {
    const out = resetFormForType(weaponForm(), 'ammo', EMPTY_FORM_FIXTURE);
    expect(out.ammoType).toBe('Bolt');
    expect(out.properties).toEqual([]);
  });

  it('clears spell fields when a spell becomes a weapon', () => {
    const spellForm = {
      ...EMPTY_FORM_FIXTURE,
      type: 'spell', category: '', name: 'Ashen Rebuke',
      school: 'Evocation', components: ['V', 'S'], classes: ['Wizard'], level: 3,
    };
    const out = resetFormForType(spellForm, 'weapon', EMPTY_FORM_FIXTURE);
    expect(out.school).toBe('');
    expect(out.components).toEqual([]);
    expect(out.classes).toEqual([]);
    expect(out.level).toBe(0);
    expect(out.name).toBe('Ashen Rebuke');
  });

  it('does not mutate the form it was given', () => {
    const original = weaponForm();
    resetFormForType(original, 'armor', EMPTY_FORM_FIXTURE);
    expect(original.damage).toBe('2d6');
    expect(original.properties).toEqual(['Heavy', 'Two-Handed']);
  });
});

// ---------------------------------------------------------------------------
// Increment 6 — parameterised weapon properties.
//
// The picker emits the bare word "Versatile", so CharacterSheet's
// /(\d+d\d+)/ match finds nothing and the two-handed damage button never
// renders. equipment.json stores "versatile (1d10)" / "thrown (20/60)" /
// "ammunition (150/600)" — lowercase and parenthesised — and that is what the
// sheet parses.
// ---------------------------------------------------------------------------

describe('serializeProperty', () => {
  it('serialises the parameterised properties the way equipment.json stores them', () => {
    expect(serializeProperty('Versatile', { die: '1d10' })).toBe('versatile (1d10)');
    expect(serializeProperty('Thrown', { normal: 20, long: 60 })).toBe('thrown (20/60)');
    expect(serializeProperty('Ammunition', { normal: 80, long: 320 })).toBe('ammunition (80/320)');
  });

  it('serialises every other property to plain lowercase', () => {
    expect(serializeProperty('Two-Handed', {})).toBe('two-handed');
    expect(serializeProperty('Finesse')).toBe('finesse');
  });
});

describe('parseProperty', () => {
  it('parses the parameterised forms back into name + params', () => {
    expect(parseProperty('ammunition (80/320)')).toEqual({ name: 'Ammunition', params: { normal: 80, long: 320 } });
    expect(parseProperty('versatile (1d10)')).toEqual({ name: 'Versatile', params: { die: '1d10' } });
  });

  it('parses a plain property', () => {
    expect(parseProperty('finesse')).toEqual({ name: 'Finesse', params: {} });
  });

  it('round-trips every parameterised and plain form', () => {
    for (const x of ['versatile (1d8)', 'thrown (20/60)', 'ammunition (150/600)', 'reach']) {
      const parsed = parseProperty(x);
      expect(serializeProperty(parsed.name, parsed.params)).toBe(x);
    }
  });

  it('passes an unrecognised stored property through instead of throwing or dropping it', () => {
    expect(parseProperty('Range')).toEqual({ name: 'Range', params: {} });
  });
});

// ---------------------------------------------------------------------------
// Increment 7 — custom ammo stack size.
//
// The inline version on the character sheet took ONE argument and ignored
// stackSize entirely, so a homebrew "Flame Arrows" with stackSize 30 always
// arrived as 20. The name group still wins, because that is how equipment.json
// ships ammo ("Arrows (20)").
// ---------------------------------------------------------------------------

describe('defaultAmmoCount', () => {
  it('lets a (N) group in the name win over stackSize', () => {
    expect(defaultAmmoCount('Arrows (20)', { stackSize: 30 })).toBe(20);
    expect(defaultAmmoCount('Bolts (20)', undefined)).toBe(20);
  });

  it('falls back to stackSize when the name carries no count', () => {
    expect(defaultAmmoCount('Flame Arrows', { stackSize: 30 })).toBe(30);
    expect(defaultAmmoCount('Flame Arrows', { stackSize: '30' })).toBe(30);   // legacy string record
  });

  it('falls back to 20 for anything that is not a positive integer stackSize', () => {
    expect(defaultAmmoCount('Flame Arrows', { stackSize: 0 })).toBe(20);
    expect(defaultAmmoCount('Flame Arrows', { stackSize: -5 })).toBe(20);
    expect(defaultAmmoCount('Flame Arrows', { stackSize: 'abc' })).toBe(20);
    expect(defaultAmmoCount('Flame Arrows', undefined)).toBe(20);
    expect(defaultAmmoCount(undefined, undefined)).toBe(20);
  });
});
