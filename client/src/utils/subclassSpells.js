// ─── Subclass-granted spells and third-caster progression ─────────────
// Pure data. This module has NO imports on purpose, so a plain `node` script
// can load it to check every spell name against spells.json.
// Read through getSubclassSpells() / thirdCasterSpellInfo() in subclassData.js.
//
// Shapes:
//   { [subclass]: { mode: 'prepared' | 'expanded', byLevel: { [classLevel]: [names] } } }
//   Warlock (2014) expanded lists are keyed by SPELL level instead: keyedBy: 'spellLevel'.
// 'prepared'  → always prepared, never counted against the character's limit.
// 'expanded'  → only widens the list the character picks known spells from.

const prepared = (byLevel) => ({ mode: 'prepared', byLevel });
const expanded = (byLevel) => ({ mode: 'expanded', keyedBy: 'spellLevel', byLevel });

// ─── 2014 ─────────────────────────────────────────────────────────────
export const SUBCLASS_SPELLS_2014 = {
  // Cleric domains — cleric levels 1/3/5/7/9
  'Knowledge Domain': prepared({ 1: ['Command', 'Identify'], 3: ['Augury', 'Suggestion'], 5: ['Nondetection', 'Speak with Dead'], 7: ['Arcane Eye', 'Confusion'], 9: ['Legend Lore', 'Scrying'] }),
  'Life Domain': prepared({ 1: ['Bless', 'Cure Wounds'], 3: ['Lesser Restoration', 'Spiritual Weapon'], 5: ['Beacon of Hope', 'Revivify'], 7: ['Death Ward', 'Guardian of Faith'], 9: ['Mass Cure Wounds', 'Raise Dead'] }),
  // Light also grants the Light cantrip at level 1 (modelled as always prepared).
  'Light Domain': prepared({ 1: ['Burning Hands', 'Faerie Fire', 'Light'], 3: ['Flaming Sphere', 'Scorching Ray'], 5: ['Daylight', 'Fireball'], 7: ['Guardian of Faith', 'Wall of Fire'], 9: ['Flame Strike', 'Scrying'] }),
  'Nature Domain': prepared({ 1: ['Animal Friendship', 'Speak with Animals'], 3: ['Barkskin', 'Spike Growth'], 5: ['Plant Growth', 'Wind Wall'], 7: ['Dominate Beast', 'Grasping Vine'], 9: ['Insect Plague', 'Tree Stride'] }),
  'Tempest Domain': prepared({ 1: ['Fog Cloud', 'Thunderwave'], 3: ['Gust of Wind', 'Shatter'], 5: ['Call Lightning', 'Sleet Storm'], 7: ['Control Water', 'Ice Storm'], 9: ['Destructive Wave', 'Insect Plague'] }),
  'Trickery Domain': prepared({ 1: ['Charm Person', 'Disguise Self'], 3: ['Mirror Image', 'Pass without Trace'], 5: ['Blink', 'Dispel Magic'], 7: ['Dimension Door', 'Polymorph'], 9: ['Dominate Person', 'Modify Memory'] }),
  'War Domain': prepared({ 1: ['Divine Favor', 'Shield of Faith'], 3: ['Magic Weapon', 'Spiritual Weapon'], 5: ["Crusader's Mantle", 'Spirit Guardians'], 7: ['Freedom of Movement', 'Stoneskin'], 9: ['Flame Strike', 'Hold Monster'] }),

  // Paladin oaths — paladin levels 3/5/9/13/17
  'Oath of Devotion': prepared({ 3: ['Protection from Evil and Good', 'Sanctuary'], 5: ['Lesser Restoration', 'Zone of Truth'], 9: ['Beacon of Hope', 'Dispel Magic'], 13: ['Freedom of Movement', 'Guardian of Faith'], 17: ['Commune', 'Flame Strike'] }),
  'Oath of the Ancients': prepared({ 3: ['Ensnaring Strike', 'Speak with Animals'], 5: ['Moonbeam', 'Misty Step'], 9: ['Plant Growth', 'Protection from Energy'], 13: ['Ice Storm', 'Stoneskin'], 17: ['Commune with Nature', 'Tree Stride'] }),
  'Oath of Vengeance': prepared({ 3: ['Bane', "Hunter's Mark"], 5: ['Hold Person', 'Misty Step'], 9: ['Haste', 'Protection from Energy'], 13: ['Banishment', 'Dimension Door'], 17: ['Hold Monster', 'Scrying'] }),
  'Oath of Glory': prepared({ 3: ['Guiding Bolt', 'Heroism'], 5: ['Enhance Ability', 'Magic Weapon'], 9: ['Haste', 'Protection from Energy'], 13: ['Compulsion', 'Freedom of Movement'], 17: ['Commune', 'Flame Strike'] }),

  // Warlock patrons — expanded list, keyed by SPELL level 1-5 (not prepared)
  'The Archfey': expanded({ 1: ['Faerie Fire', 'Sleep'], 2: ['Calm Emotions', 'Phantasmal Force'], 3: ['Blink', 'Plant Growth'], 4: ['Dominate Beast', 'Greater Invisibility'], 5: ['Dominate Person', 'Seeming'] }),
  'The Fiend': expanded({ 1: ['Burning Hands', 'Command'], 2: ['Blindness/Deafness', 'Scorching Ray'], 3: ['Fireball', 'Stinking Cloud'], 4: ['Fire Shield', 'Wall of Fire'], 5: ['Flame Strike', 'Hallow'] }),
  'The Great Old One': expanded({ 1: ['Dissonant Whispers', "Tasha's Hideous Laughter"], 2: ['Detect Thoughts', 'Phantasmal Force'], 3: ['Clairvoyance', 'Sending'], 4: ['Dominate Beast', "Evard's Black Tentacles"], 5: ['Dominate Person', 'Telekinesis'] }),
};

// Circle of the Land (2014) — druid levels 3/5/7/9, always prepared.
export const LAND_SPELLS_2014 = {
  Arctic: { 3: ['Hold Person', 'Spike Growth'], 5: ['Sleet Storm', 'Slow'], 7: ['Freedom of Movement', 'Ice Storm'], 9: ['Commune with Nature', 'Cone of Cold'] },
  Coast: { 3: ['Mirror Image', 'Misty Step'], 5: ['Water Breathing', 'Water Walk'], 7: ['Control Water', 'Freedom of Movement'], 9: ['Conjure Elemental', 'Scrying'] },
  Desert: { 3: ['Blur', 'Silence'], 5: ['Create Food and Water', 'Protection from Energy'], 7: ['Blight', 'Hallucinatory Terrain'], 9: ['Insect Plague', 'Wall of Stone'] },
  Forest: { 3: ['Barkskin', 'Spider Climb'], 5: ['Call Lightning', 'Plant Growth'], 7: ['Divination', 'Freedom of Movement'], 9: ['Commune with Nature', 'Tree Stride'] },
  Grassland: { 3: ['Invisibility', 'Pass without Trace'], 5: ['Daylight', 'Haste'], 7: ['Divination', 'Freedom of Movement'], 9: ['Dream', 'Insect Plague'] },
  Mountain: { 3: ['Spider Climb', 'Spike Growth'], 5: ['Lightning Bolt', 'Meld into Stone'], 7: ['Stone Shape', 'Stoneskin'], 9: ['Passwall', 'Wall of Stone'] },
  Swamp: { 3: ['Darkness', "Melf's Acid Arrow"], 5: ['Water Walk', 'Stinking Cloud'], 7: ['Freedom of Movement', 'Locate Creature'], 9: ['Insect Plague', 'Scrying'] },
  Underdark: { 3: ['Spider Climb', 'Web'], 5: ['Gaseous Form', 'Stinking Cloud'], 7: ['Greater Invisibility', 'Stone Shape'], 9: ['Cloudkill', 'Insect Plague'] },
};

// ─── 2024 — every subclass list is always prepared ────────────────────
export const SUBCLASS_SPELLS_2024 = {
  // Cleric — cleric levels 3/5/7/9
  'Life Domain': prepared({ 3: ['Aid', 'Bless', 'Cure Wounds', 'Lesser Restoration'], 5: ['Mass Healing Word', 'Revivify'], 7: ['Aura of Life', 'Death Ward'], 9: ['Greater Restoration', 'Mass Cure Wounds'] }),
  'Light Domain': prepared({ 3: ['Burning Hands', 'Faerie Fire', 'Scorching Ray', 'See Invisibility'], 5: ['Daylight', 'Fireball'], 7: ['Arcane Eye', 'Wall of Fire'], 9: ['Flame Strike', 'Scrying'] }),
  'Trickery Domain': prepared({ 3: ['Charm Person', 'Disguise Self', 'Invisibility', 'Pass without Trace'], 5: ['Hypnotic Pattern', 'Nondetection'], 7: ['Confusion', 'Dimension Door'], 9: ['Dominate Person', 'Modify Memory'] }),
  'War Domain': prepared({ 3: ['Guiding Bolt', 'Magic Weapon', 'Shield of Faith', 'Spiritual Weapon'], 5: ["Crusader's Mantle", 'Spirit Guardians'], 7: ['Fire Shield', 'Freedom of Movement'], 9: ['Hold Monster', 'Steel Wind Strike'] }),

  // Druid — druid levels 3/5/7/9 (Circle of the Land reads LAND_SPELLS_2024)
  'Circle of the Moon': prepared({ 3: ['Cure Wounds', 'Moonbeam', 'Starry Wisp'], 5: ['Conjure Animals'], 7: ['Fount of Moonlight'], 9: ['Mass Cure Wounds'] }),
  'Circle of the Sea': prepared({ 3: ['Fog Cloud', 'Gust of Wind', 'Ray of Frost', 'Shatter', 'Thunderwave'], 5: ['Lightning Bolt', 'Water Breathing'], 7: ['Control Water', 'Ice Storm'], 9: ['Conjure Elemental', 'Hold Monster'] }),
  'Circle of the Stars': prepared({ 3: ['Guidance', 'Guiding Bolt'] }),

  // Paladin — paladin levels 3/5/9/13/17
  'Oath of Devotion': prepared({ 3: ['Protection from Evil and Good', 'Shield of Faith'], 5: ['Aid', 'Zone of Truth'], 9: ['Beacon of Hope', 'Dispel Magic'], 13: ['Freedom of Movement', 'Guardian of Faith'], 17: ['Commune', 'Flame Strike'] }),
  'Oath of Glory': prepared({ 3: ['Guiding Bolt', 'Heroism'], 5: ['Enhance Ability', 'Magic Weapon'], 9: ['Haste', 'Protection from Energy'], 13: ['Compulsion', 'Freedom of Movement'], 17: ['Legend Lore', "Yolande's Regal Presence"] }),
  'Oath of the Ancients': SUBCLASS_SPELLS_2014['Oath of the Ancients'],
  'Oath of Vengeance': SUBCLASS_SPELLS_2014['Oath of Vengeance'],

  // Ranger — ranger levels 3/5/9/13/17
  'Fey Wanderer': prepared({ 3: ['Charm Person'], 5: ['Misty Step'], 9: ['Summon Fey'], 13: ['Dimension Door'], 17: ['Mislead'] }),
  'Gloom Stalker': prepared({ 3: ['Disguise Self'], 5: ['Rope Trick'], 9: ['Fear'], 13: ['Greater Invisibility'], 17: ['Seeming'] }),

  // Sorcerer — sorcerer levels 3/5/7/9
  'Aberrant Sorcery': prepared({ 3: ['Arms of Hadar', 'Calm Emotions', 'Detect Thoughts', 'Dissonant Whispers', 'Mind Sliver'], 5: ['Hunger of Hadar', 'Sending'], 7: ["Evard's Black Tentacles", 'Summon Aberration'], 9: ["Rary's Telepathic Bond", 'Telekinesis'] }),
  'Clockwork Sorcery': prepared({ 3: ['Aid', 'Alarm', 'Lesser Restoration', 'Protection from Evil and Good'], 5: ['Dispel Magic', 'Protection from Energy'], 7: ['Freedom of Movement', 'Summon Construct'], 9: ['Greater Restoration', 'Wall of Force'] }),
  'Draconic Sorcery': prepared({ 3: ['Alter Self', 'Chromatic Orb', 'Command', "Dragon's Breath"], 5: ['Fear', 'Fly'], 7: ['Arcane Eye', 'Charm Monster'], 9: ['Legend Lore', 'Summon Dragon'] }),

  // Warlock — warlock levels 3/5/7/9, PREPARED in 2024
  'Archfey Patron': prepared({ 3: ['Calm Emotions', 'Faerie Fire', 'Misty Step', 'Phantasmal Force', 'Sleep'], 5: ['Blink', 'Plant Growth'], 7: ['Dominate Beast', 'Greater Invisibility'], 9: ['Dominate Person', 'Seeming'] }),
  'Celestial Patron': prepared({ 3: ['Aid', 'Cure Wounds', 'Guiding Bolt', 'Lesser Restoration', 'Light', 'Sacred Flame'], 5: ['Daylight', 'Revivify'], 7: ['Guardian of Faith', 'Wall of Fire'], 9: ['Greater Restoration', 'Summon Celestial'] }),
  'Fiend Patron': prepared({ 3: ['Burning Hands', 'Command', 'Scorching Ray', 'Suggestion'], 5: ['Fireball', 'Stinking Cloud'], 7: ['Fire Shield', 'Wall of Fire'], 9: ['Geas', 'Insect Plague'] }),
  'Great Old One Patron': prepared({ 3: ['Detect Thoughts', 'Dissonant Whispers', 'Phantasmal Force', "Tasha's Hideous Laughter"], 5: ['Clairvoyance', 'Hunger of Hadar'], 7: ['Confusion', 'Summon Aberration'], 9: ['Modify Memory', 'Telekinesis'] }),

  // Bard
  'College of Glamour': prepared({ 3: ['Charm Person', 'Mirror Image'] }),
};

// Circle of the Land (2024) — druid levels 3/5/7/9. The land can be changed on a long rest.
export const LAND_SPELLS_2024 = {
  Arid: { 3: ['Blur', 'Burning Hands', 'Fire Bolt'], 5: ['Fireball'], 7: ['Blight'], 9: ['Wall of Stone'] },
  Polar: { 3: ['Fog Cloud', 'Hold Person', 'Ray of Frost'], 5: ['Sleet Storm'], 7: ['Ice Storm'], 9: ['Cone of Cold'] },
  Temperate: { 3: ['Misty Step', 'Shocking Grasp', 'Sleep'], 5: ['Lightning Bolt'], 7: ['Freedom of Movement'], 9: ['Tree Stride'] },
  Tropical: { 3: ['Acid Splash', 'Ray of Sickness', 'Web'], 5: ['Stinking Cloud'], 7: ['Polymorph'], 9: ['Insect Plague'] },
};

// Rules-accurate names that spells.json does not contain (measured 2026-09-27
// against its 521 entries). The UI shows them name-only. A test fails if one of
// them is later added to spells.json, so this set stays honest.
export const SUBCLASS_SPELLS_NOT_IN_DATA = new Set([
  'Commune', 'Commune with Nature', 'Hallow', 'Starry Wisp', 'Fount of Moonlight', "Rary's Telepathic Bond", 'Summon Dragon',
]);

/** Every spell name in every table above. */
export function allSubclassSpellNames() {
  const out = new Set();
  for (const table of [SUBCLASS_SPELLS_2014, SUBCLASS_SPELLS_2024]) {
    for (const entry of Object.values(table)) for (const names of Object.values(entry.byLevel)) names.forEach(n => out.add(n));
  }
  for (const table of [LAND_SPELLS_2014, LAND_SPELLS_2024]) {
    for (const land of Object.values(table)) for (const names of Object.values(land)) names.forEach(n => out.add(n));
  }
  return out;
}

// ─── Eldritch Knight / Arcane Trickster progression ───────────────────
// ⚠ LEAST-CERTAIN DATA — 2024 counts to be confirmed by the rules auditor.
// Arrays have 20 entries indexed by class level − 1. Cantrip arrays hold the
// book totals, which INCLUDE Mage Hand for the Arcane Trickster; the player
// picks (total − alwaysKnownCantrips.length).
const EK_CANTRIPS = [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
const AT_CANTRIPS = [0, 0, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
const THIRD_SPELLS = [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13];

export const THIRD_CASTER_PROGRESSION = {
  '2014': {
    'Eldritch Knight': { cantrips: EK_CANTRIPS, spells: THIRD_SPELLS, type: 'known', schools: ['Abjuration', 'Evocation'], anySchoolLevels: [3, 8, 14, 20], alwaysKnownCantrips: [] },
    'Arcane Trickster': { cantrips: AT_CANTRIPS, spells: THIRD_SPELLS, type: 'known', schools: ['Enchantment', 'Illusion'], anySchoolLevels: [3, 8, 14, 20], alwaysKnownCantrips: ['Mage Hand'] },
  },
  '2024': {
    'Eldritch Knight': { cantrips: EK_CANTRIPS, spells: THIRD_SPELLS, type: 'prepared', schools: null, anySchoolLevels: [], alwaysKnownCantrips: [] },
    'Arcane Trickster': { cantrips: AT_CANTRIPS, spells: THIRD_SPELLS, type: 'prepared', schools: null, anySchoolLevels: [], alwaysKnownCantrips: ['Mage Hand'] },
  },
};
