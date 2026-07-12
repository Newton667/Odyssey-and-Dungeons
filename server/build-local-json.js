// Builds local JSON backups of equipment and spells from seed files.
// Run: node server/build-local-json.js

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'client', 'src', 'data');

// ─── Equipment ───────────────────────────────────────────────
// Extract the equipment array from seed-equipment.js
const eqContent = fs.readFileSync(path.join(__dirname, 'seed-equipment.js'), 'utf8');
const eqMatch = eqContent.match(/const equipment = \[([\s\S]*?)\n\];/);
let equipmentItems = [];
if (eqMatch) {
  try { equipmentItems = eval(`[${eqMatch[1]}]`); } catch (e) { console.error('Failed to parse equipment:', e.message); }
}

// Extract magic items
const magicContent = fs.readFileSync(path.join(__dirname, 'seed-magic-items.js'), 'utf8');
const magicMatch = magicContent.match(/const magicItems = \[([\s\S]*?)\n\];/);
let magicItems = [];
if (magicMatch) {
  try { magicItems = eval(`[${magicMatch[1]}]`); } catch (e) { console.error('Failed to parse magic items:', e.message); }
}

const allEquipment = [...equipmentItems, ...magicItems].map((item, i) => ({
  _id: `local_eq_${i}`,
  ...item,
  rarity: item.rarity || 'common',
  magical: item.magical || false,
}));

fs.writeFileSync(path.join(outDir, 'equipment.json'), JSON.stringify(allEquipment, null, 2));
console.log(`Exported ${allEquipment.length} equipment items to client/src/data/equipment.json`);

// ─── Spells ──────────────────────────────────────────────────
const spellFiles = [
  'seed-cantrips.js', 'seed-level1.js', 'seed-level2.js', 'seed-level3.js',
  'seed-level4.js', 'seed-level5.js', 'seed-level6.js', 'seed-level7.js',
  'seed-level8.js', 'seed-level9.js', 'seed-racial-abilities.js', 'seed-missing.js',
];

let allSpells = [];
for (const file of spellFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) { console.log(`Skipping ${file} (not found)`); continue; }
  const content = fs.readFileSync(filePath, 'utf8');
  // Try to find the array variable
  const match = content.match(/const (?:CANTRIPS|SPELLS|RACIAL_ABILITIES|MISSING_SPELLS|cantrips|spells|racialAbilities|missingSpells) = \[([\s\S]*?)\n\];/);
  if (match) {
    try {
      const items = eval(`[${match[1]}]`);
      allSpells.push(...items);
    } catch (e) { console.error(`Failed to parse ${file}:`, e.message); }
  } else {
    console.log(`Could not find array in ${file}`);
  }
}

allSpells = allSpells.map((spell, i) => {
  const s = { _id: `local_sp_${i}`, ...spell, source: spell.source || 'class' };
  // Auto-populate scaling from higherLevels text if not set
  if (!s.scaling && s.higherLevels && s.level > 0) {
    const m = s.higherLevels.match(/increases? by (\d+d\d+)/i);
    if (m) s.scaling = m[1];
  }
  return s;
});

fs.writeFileSync(path.join(outDir, 'spells.json'), JSON.stringify(allSpells, null, 2));
console.log(`Exported ${allSpells.length} spells to client/src/data/spells.json`);
