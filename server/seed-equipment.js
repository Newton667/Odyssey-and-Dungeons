require('dotenv').config();
const mongoose = require('mongoose');
const Equipment = require('./models/Equipment');

const equipment = [
  // ═══════════════════════════════════════════════
  // ARMOR
  // ═══════════════════════════════════════════════

  // Light Armor
  { name: 'Padded', category: 'armor', subcategory: 'Light Armor', cost: '5 gp', weight: '8 lb.', ac: '11 + Dex', stealthDisadv: true, description: 'Padded armor consists of quilted layers of cloth and batting.' },
  { name: 'Leather', category: 'armor', subcategory: 'Light Armor', cost: '10 gp', weight: '10 lb.', ac: '11 + Dex', description: 'The breastplate and shoulder protectors of this armor are made of leather that has been stiffened by being boiled in oil.' },
  { name: 'Studded Leather', category: 'armor', subcategory: 'Light Armor', cost: '45 gp', weight: '13 lb.', ac: '12 + Dex', description: 'Made from tough but flexible leather, studded leather is reinforced with close-set rivets or spikes.' },

  // Medium Armor
  { name: 'Hide', category: 'armor', subcategory: 'Medium Armor', cost: '10 gp', weight: '12 lb.', ac: '12 + Dex (max 2)', description: 'This crude armor consists of thick furs and pelts.' },
  { name: 'Chain Shirt', category: 'armor', subcategory: 'Medium Armor', cost: '50 gp', weight: '20 lb.', ac: '13 + Dex (max 2)', description: 'Made of interlocking metal rings, worn between layers of clothing or leather.' },
  { name: 'Scale Mail', category: 'armor', subcategory: 'Medium Armor', cost: '50 gp', weight: '45 lb.', ac: '14 + Dex (max 2)', stealthDisadv: true, description: 'This armor consists of a coat and leggings of leather covered with overlapping pieces of metal.' },
  { name: 'Breastplate', category: 'armor', subcategory: 'Medium Armor', cost: '400 gp', weight: '20 lb.', ac: '14 + Dex (max 2)', description: 'This armor consists of a fitted metal chest piece worn with supple leather.' },
  { name: 'Half Plate', category: 'armor', subcategory: 'Medium Armor', cost: '750 gp', weight: '40 lb.', ac: '15 + Dex (max 2)', stealthDisadv: true, description: 'Half plate consists of shaped metal plates that cover most of the body.' },

  // Heavy Armor
  { name: 'Ring Mail', category: 'armor', subcategory: 'Heavy Armor', cost: '30 gp', weight: '40 lb.', ac: '14', stealthDisadv: true, description: 'This armor is leather armor with heavy rings sewn into it.' },
  { name: 'Chain Mail', category: 'armor', subcategory: 'Heavy Armor', cost: '75 gp', weight: '55 lb.', ac: '16', strReq: 13, stealthDisadv: true, description: 'Made of interlocking metal rings, chain mail includes a layer of quilted fabric worn underneath.' },
  { name: 'Splint', category: 'armor', subcategory: 'Heavy Armor', cost: '200 gp', weight: '60 lb.', ac: '17', strReq: 15, stealthDisadv: true, description: 'This armor is made of narrow vertical strips of metal riveted to a backing of leather.' },
  { name: 'Plate', category: 'armor', subcategory: 'Heavy Armor', cost: '1,500 gp', weight: '65 lb.', ac: '18', strReq: 15, stealthDisadv: true, description: 'Plate consists of shaped, interlocking metal plates to cover the entire body. Includes gauntlets, heavy leather boots, a visored helmet, and thick layers of padding.' },

  // Shield
  { name: 'Shield', category: 'armor', subcategory: 'Shield', cost: '10 gp', weight: '6 lb.', ac: '+2', description: 'A shield is made from wood or metal and is carried in one hand. Wielding a shield increases your AC by 2.' },

  // ═══════════════════════════════════════════════
  // WEAPONS — Simple Melee
  // ═══════════════════════════════════════════════
  { name: 'Club', category: 'weapon', subcategory: 'Simple Melee', cost: '1 sp', weight: '2 lb.', damage: '1d4', damageType: 'bludgeoning', properties: ['light'] },
  { name: 'Dagger', category: 'weapon', subcategory: 'Simple Melee', cost: '2 gp', weight: '1 lb.', damage: '1d4', damageType: 'piercing', properties: ['finesse', 'light', 'thrown (20/60)'] },
  { name: 'Greatclub', category: 'weapon', subcategory: 'Simple Melee', cost: '2 sp', weight: '10 lb.', damage: '1d8', damageType: 'bludgeoning', properties: ['two-handed'] },
  { name: 'Handaxe', category: 'weapon', subcategory: 'Simple Melee', cost: '5 gp', weight: '2 lb.', damage: '1d6', damageType: 'slashing', properties: ['light', 'thrown (20/60)'] },
  { name: 'Javelin', category: 'weapon', subcategory: 'Simple Melee', cost: '5 sp', weight: '2 lb.', damage: '1d6', damageType: 'piercing', properties: ['thrown (30/120)'] },
  { name: 'Light Hammer', category: 'weapon', subcategory: 'Simple Melee', cost: '2 gp', weight: '2 lb.', damage: '1d4', damageType: 'bludgeoning', properties: ['light', 'thrown (20/60)'] },
  { name: 'Mace', category: 'weapon', subcategory: 'Simple Melee', cost: '5 gp', weight: '4 lb.', damage: '1d6', damageType: 'bludgeoning', properties: [] },
  { name: 'Quarterstaff', category: 'weapon', subcategory: 'Simple Melee', cost: '2 sp', weight: '4 lb.', damage: '1d6', damageType: 'bludgeoning', properties: ['versatile (1d8)'] },
  { name: 'Sickle', category: 'weapon', subcategory: 'Simple Melee', cost: '1 gp', weight: '2 lb.', damage: '1d4', damageType: 'slashing', properties: ['light'] },
  { name: 'Spear', category: 'weapon', subcategory: 'Simple Melee', cost: '1 gp', weight: '3 lb.', damage: '1d6', damageType: 'piercing', properties: ['thrown (20/60)', 'versatile (1d8)'] },

  // WEAPONS — Simple Ranged
  { name: 'Light Crossbow', category: 'weapon', subcategory: 'Simple Ranged', cost: '25 gp', weight: '5 lb.', damage: '1d8', damageType: 'piercing', properties: ['ammunition (80/320)', 'loading', 'two-handed'] },
  { name: 'Dart', category: 'weapon', subcategory: 'Simple Ranged', cost: '5 cp', weight: '1/4 lb.', damage: '1d4', damageType: 'piercing', properties: ['finesse', 'thrown (20/60)'] },
  { name: 'Shortbow', category: 'weapon', subcategory: 'Simple Ranged', cost: '25 gp', weight: '2 lb.', damage: '1d6', damageType: 'piercing', properties: ['ammunition (80/320)', 'two-handed'] },
  { name: 'Sling', category: 'weapon', subcategory: 'Simple Ranged', cost: '1 sp', weight: '—', damage: '1d4', damageType: 'bludgeoning', properties: ['ammunition (30/120)'] },

  // WEAPONS — Martial Melee
  { name: 'Battleaxe', category: 'weapon', subcategory: 'Martial Melee', cost: '10 gp', weight: '4 lb.', damage: '1d8', damageType: 'slashing', properties: ['versatile (1d10)'] },
  { name: 'Flail', category: 'weapon', subcategory: 'Martial Melee', cost: '10 gp', weight: '2 lb.', damage: '1d8', damageType: 'bludgeoning', properties: [] },
  { name: 'Glaive', category: 'weapon', subcategory: 'Martial Melee', cost: '20 gp', weight: '6 lb.', damage: '1d10', damageType: 'slashing', properties: ['heavy', 'reach', 'two-handed'] },
  { name: 'Greataxe', category: 'weapon', subcategory: 'Martial Melee', cost: '30 gp', weight: '7 lb.', damage: '1d12', damageType: 'slashing', properties: ['heavy', 'two-handed'] },
  { name: 'Greatsword', category: 'weapon', subcategory: 'Martial Melee', cost: '50 gp', weight: '6 lb.', damage: '2d6', damageType: 'slashing', properties: ['heavy', 'two-handed'] },
  { name: 'Halberd', category: 'weapon', subcategory: 'Martial Melee', cost: '20 gp', weight: '6 lb.', damage: '1d10', damageType: 'slashing', properties: ['heavy', 'reach', 'two-handed'] },
  { name: 'Lance', category: 'weapon', subcategory: 'Martial Melee', cost: '10 gp', weight: '6 lb.', damage: '1d12', damageType: 'piercing', properties: ['reach', 'special'], description: 'You have disadvantage when you use a lance to attack a target within 5 feet of you. A lance requires two hands to wield when you aren\'t mounted.' },
  { name: 'Longsword', category: 'weapon', subcategory: 'Martial Melee', cost: '15 gp', weight: '3 lb.', damage: '1d8', damageType: 'slashing', properties: ['versatile (1d10)'] },
  { name: 'Maul', category: 'weapon', subcategory: 'Martial Melee', cost: '10 gp', weight: '10 lb.', damage: '2d6', damageType: 'bludgeoning', properties: ['heavy', 'two-handed'] },
  { name: 'Morningstar', category: 'weapon', subcategory: 'Martial Melee', cost: '15 gp', weight: '4 lb.', damage: '1d8', damageType: 'piercing', properties: [] },
  { name: 'Pike', category: 'weapon', subcategory: 'Martial Melee', cost: '5 gp', weight: '18 lb.', damage: '1d10', damageType: 'piercing', properties: ['heavy', 'reach', 'two-handed'] },
  { name: 'Rapier', category: 'weapon', subcategory: 'Martial Melee', cost: '25 gp', weight: '2 lb.', damage: '1d8', damageType: 'piercing', properties: ['finesse'] },
  { name: 'Scimitar', category: 'weapon', subcategory: 'Martial Melee', cost: '25 gp', weight: '3 lb.', damage: '1d6', damageType: 'slashing', properties: ['finesse', 'light'] },
  { name: 'Shortsword', category: 'weapon', subcategory: 'Martial Melee', cost: '10 gp', weight: '2 lb.', damage: '1d6', damageType: 'piercing', properties: ['finesse', 'light'] },
  { name: 'Trident', category: 'weapon', subcategory: 'Martial Melee', cost: '5 gp', weight: '4 lb.', damage: '1d6', damageType: 'piercing', properties: ['thrown (20/60)', 'versatile (1d8)'] },
  { name: 'War Pick', category: 'weapon', subcategory: 'Martial Melee', cost: '5 gp', weight: '2 lb.', damage: '1d8', damageType: 'piercing', properties: [] },
  { name: 'Warhammer', category: 'weapon', subcategory: 'Martial Melee', cost: '15 gp', weight: '2 lb.', damage: '1d8', damageType: 'bludgeoning', properties: ['versatile (1d10)'] },
  { name: 'Whip', category: 'weapon', subcategory: 'Martial Melee', cost: '2 gp', weight: '3 lb.', damage: '1d4', damageType: 'slashing', properties: ['finesse', 'reach'] },

  // WEAPONS — Martial Ranged
  { name: 'Blowgun', category: 'weapon', subcategory: 'Martial Ranged', cost: '10 gp', weight: '1 lb.', damage: '1', damageType: 'piercing', properties: ['ammunition (25/100)', 'loading'] },
  { name: 'Hand Crossbow', category: 'weapon', subcategory: 'Martial Ranged', cost: '75 gp', weight: '3 lb.', damage: '1d6', damageType: 'piercing', properties: ['ammunition (30/120)', 'light', 'loading'] },
  { name: 'Heavy Crossbow', category: 'weapon', subcategory: 'Martial Ranged', cost: '50 gp', weight: '18 lb.', damage: '1d10', damageType: 'piercing', properties: ['ammunition (100/400)', 'heavy', 'loading', 'two-handed'] },
  { name: 'Longbow', category: 'weapon', subcategory: 'Martial Ranged', cost: '50 gp', weight: '2 lb.', damage: '1d8', damageType: 'piercing', properties: ['ammunition (150/600)', 'heavy', 'two-handed'] },
  { name: 'Net', category: 'weapon', subcategory: 'Martial Ranged', cost: '1 gp', weight: '3 lb.', damage: '—', damageType: '', properties: ['special', 'thrown (5/15)'], description: 'A Large or smaller creature hit by a net is restrained until freed. A net has no effect on formless or Huge+ creatures. DC 10 STR check or deal 5 slashing damage to the net (AC 10, 5 HP) to free.' },

  // ═══════════════════════════════════════════════
  // ADVENTURING GEAR
  // ═══════════════════════════════════════════════
  { name: 'Abacus', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 gp', weight: '2 lb.' },
  { name: 'Acid (vial)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '25 gp', weight: '1 lb.', description: 'As an action, splash onto a creature within 5 feet or throw up to 20 feet. Ranged attack, 2d6 acid damage on hit.' },
  { name: 'Alchemist\'s Fire (flask)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '50 gp', weight: '1 lb.', description: 'As an action, throw up to 20 feet. Ranged attack, 1d4 fire damage at start of each turn. DC 10 DEX to extinguish.' },
  { name: 'Antitoxin (vial)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '50 gp', weight: '—', description: 'Advantage on saves vs. poison for 1 hour.' },
  { name: 'Backpack', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 gp', weight: '5 lb.', description: 'Holds 1 cubic foot / 30 pounds of gear.' },
  { name: 'Ball Bearings (bag of 1,000)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 gp', weight: '2 lb.', description: 'Covers 10×10 ft. DEX DC 10 save or fall prone.' },
  { name: 'Barrel', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 gp', weight: '70 lb.', description: 'Holds 40 gallons liquid or 4 cubic feet solid.' },
  { name: 'Bedroll', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 gp', weight: '7 lb.' },
  { name: 'Bell', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 gp', weight: '—' },
  { name: 'Blanket', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 sp', weight: '3 lb.' },
  { name: 'Block and Tackle', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 gp', weight: '5 lb.', description: 'Allows you to hoist up to 4× the weight you can normally lift.' },
  { name: 'Book', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '25 gp', weight: '5 lb.' },
  { name: 'Caltrops (bag of 20)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 gp', weight: '2 lb.', description: 'Covers 5×5 ft. DEX DC 15 or take 1 piercing and stop moving. Speed reduced by 10 until healed.' },
  { name: 'Candle', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 cp', weight: '—', description: 'Bright light 5 ft, dim light additional 5 ft. Lasts 1 hour.' },
  { name: 'Case, Crossbow Bolt', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 gp', weight: '1 lb.', description: 'Holds up to 20 crossbow bolts.' },
  { name: 'Case, Map or Scroll', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 gp', weight: '1 lb.' },
  { name: 'Chain (10 feet)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 gp', weight: '10 lb.', description: 'AC 20, 10 HP. Can be burst with DC 20 STR check.' },
  { name: 'Chalk (1 piece)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 cp', weight: '—' },
  { name: 'Chest', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 gp', weight: '25 lb.', description: 'Holds 12 cubic feet / 300 pounds of gear.' },
  { name: 'Climber\'s Kit', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '25 gp', weight: '12 lb.', description: 'Includes pitons, boot tips, gloves, and a harness. Allows anchoring; fall no more than 25 feet.' },
  { name: 'Component Pouch', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '25 gp', weight: '2 lb.', description: 'A small pouch that holds all material components and focuses needed for spellcasting (except those with a cost).' },
  { name: 'Crowbar', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 gp', weight: '5 lb.', description: 'Advantage on STR checks where leverage can be applied.' },
  { name: 'Fishing Tackle', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 gp', weight: '4 lb.' },
  { name: 'Flask or Tankard', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 cp', weight: '1 lb.' },
  { name: 'Grappling Hook', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 gp', weight: '4 lb.' },
  { name: 'Hammer', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 gp', weight: '3 lb.' },
  { name: 'Hammer, Sledge', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 gp', weight: '10 lb.' },
  { name: 'Healer\'s Kit', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 gp', weight: '3 lb.', description: '10 uses. As an action, stabilize a creature at 0 HP without a Medicine check.' },
  { name: 'Holy Water (flask)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '25 gp', weight: '1 lb.', description: 'As an action, splash onto a creature within 5 feet or throw up to 20 feet. 2d6 radiant damage to fiends and undead.' },
  { name: 'Hourglass', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '25 gp', weight: '1 lb.' },
  { name: 'Hunting Trap', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 gp', weight: '25 lb.', description: 'DC 13 DEX or take 1d4 piercing and stop moving. DC 13 STR to free.' },
  { name: 'Ink (1 ounce bottle)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '10 gp', weight: '—' },
  { name: 'Ink Pen', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 cp', weight: '—' },
  { name: 'Jug or Pitcher', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 cp', weight: '4 lb.' },
  { name: 'Ladder (10-foot)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 sp', weight: '25 lb.' },
  { name: 'Lamp', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 sp', weight: '1 lb.', description: 'Bright light 15 ft, dim light additional 30 ft. Burns 6 hours on 1 pint of oil.' },
  { name: 'Lantern, Bullseye', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '10 gp', weight: '2 lb.', description: 'Bright light 60 ft cone, dim light additional 60 ft. Burns 6 hours on 1 pint of oil.' },
  { name: 'Lantern, Hooded', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 gp', weight: '2 lb.', description: 'Bright light 30 ft, dim light additional 30 ft. Burns 6 hours. Can lower hood to dim light 5 ft.' },
  { name: 'Lock', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '10 gp', weight: '1 lb.', description: 'DC 15 DEX check with thieves\' tools to pick.' },
  { name: 'Magnifying Glass', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '100 gp', weight: '—', description: 'Grants advantage on Appraisal checks for small/detailed items. Can start fires with sunlight.' },
  { name: 'Manacles', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 gp', weight: '6 lb.', description: 'DC 20 STR to break. DC 15 DEX with thieves\' tools to escape.' },
  { name: 'Mess Kit', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 sp', weight: '1 lb.' },
  { name: 'Mirror, Steel', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 gp', weight: '1/2 lb.' },
  { name: 'Oil (flask)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 sp', weight: '1 lb.', description: 'Splash on creature within 5 feet or throw 20 feet. If ignited, 5 fire damage for 2 rounds.' },
  { name: 'Paper (one sheet)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 sp', weight: '—' },
  { name: 'Parchment (one sheet)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 sp', weight: '—' },
  { name: 'Perfume (vial)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 gp', weight: '—' },
  { name: 'Pick, Miner\'s', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 gp', weight: '10 lb.' },
  { name: 'Piton', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 cp', weight: '1/4 lb.' },
  { name: 'Poison, Basic (vial)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '100 gp', weight: '—', description: 'Apply to one weapon or up to 3 pieces of ammunition. Next hit deals extra 1d4 poison damage. Dries after 1 minute.' },
  { name: 'Pole (10-foot)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 cp', weight: '7 lb.' },
  { name: 'Pot, Iron', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 gp', weight: '10 lb.' },
  { name: 'Potion of Healing', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '50 gp', weight: '1/2 lb.', description: 'Drink as an action to regain 2d4+2 hit points.' },
  { name: 'Pouch', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 sp', weight: '1 lb.', description: 'Holds 1/5 cubic foot / 6 pounds of gear.' },
  { name: 'Quiver', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 gp', weight: '1 lb.', description: 'Holds up to 20 arrows.' },
  { name: 'Ram, Portable', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '4 gp', weight: '35 lb.', description: '+4 bonus to STR checks to break down doors. Another character can assist for advantage.' },
  { name: 'Rations (1 day)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 sp', weight: '2 lb.' },
  { name: 'Robes', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 gp', weight: '4 lb.' },
  { name: 'Rope, Hempen (50 feet)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 gp', weight: '10 lb.', description: '2 HP, can be burst with DC 17 STR check.' },
  { name: 'Rope, Silk (50 feet)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '10 gp', weight: '5 lb.', description: '2 HP, can be burst with DC 17 STR check.' },
  { name: 'Sack', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 cp', weight: '1/2 lb.', description: 'Holds 1 cubic foot / 30 pounds of gear.' },
  { name: 'Scale, Merchant\'s', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 gp', weight: '3 lb.' },
  { name: 'Sealing Wax', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 sp', weight: '—' },
  { name: 'Shovel', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 gp', weight: '5 lb.' },
  { name: 'Signal Whistle', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 cp', weight: '—' },
  { name: 'Signet Ring', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 gp', weight: '—' },
  { name: 'Soap', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 cp', weight: '—' },
  { name: 'Spellbook', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '50 gp', weight: '3 lb.', description: 'Essential for wizards. Can hold up to 100 pages of spells.' },
  { name: 'Spikes, Iron (10)', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 gp', weight: '5 lb.' },
  { name: 'Spyglass', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1,000 gp', weight: '1 lb.', description: 'Objects viewed through a spyglass are magnified to twice their size.' },
  { name: 'Tent, Two-Person', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 gp', weight: '20 lb.' },
  { name: 'Tinderbox', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '5 sp', weight: '1 lb.', description: 'Lighting a torch takes an action. Lighting anything else takes 1 minute.' },
  { name: 'Torch', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 cp', weight: '1 lb.', description: 'Bright light 20 ft, dim light additional 20 ft. Burns 1 hour. Melee attack: 1 fire damage.' },
  { name: 'Vial', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 gp', weight: '—', description: 'Holds up to 4 ounces of liquid.' },
  { name: 'Waterskin', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '2 sp', weight: '5 lb. (full)', description: 'Holds 4 pints of liquid.' },
  { name: 'Whetstone', category: 'adventuring-gear', subcategory: 'Adventuring Gear', cost: '1 cp', weight: '1 lb.' },

  // Ammunition — Common
  { name: 'Arrows (20)', category: 'adventuring-gear', subcategory: 'Ammunition', cost: '1 gp', weight: '1 lb.', description: 'A quiver of 20 standard arrows for use with longbows and shortbows.' },
  { name: 'Blowgun Needles (50)', category: 'adventuring-gear', subcategory: 'Ammunition', cost: '1 gp', weight: '1 lb.', description: 'A case of 50 tiny needles for use with a blowgun.' },
  { name: 'Crossbow Bolts (20)', category: 'adventuring-gear', subcategory: 'Ammunition', cost: '1 gp', weight: '1½ lb.', description: 'A case of 20 crossbow bolts for use with light, heavy, or hand crossbows.' },
  { name: 'Sling Bullets (20)', category: 'adventuring-gear', subcategory: 'Ammunition', cost: '4 cp', weight: '1½ lb.', description: 'A pouch of 20 lead sling bullets.' },

  // Ammunition — Magical
  { name: 'Arrows +1 (10)', category: 'adventuring-gear', subcategory: 'Ammunition', cost: '25 gp', weight: '½ lb.', rarity: 'uncommon', magical: true, bonus: 1, description: 'You have a +1 bonus to attack and damage rolls made with these magic arrows. Once an arrow hits or misses, it loses its magic.' },
  { name: 'Arrows +2 (10)', category: 'adventuring-gear', subcategory: 'Ammunition', cost: '100 gp', weight: '½ lb.', rarity: 'rare', magical: true, bonus: 2, description: 'You have a +2 bonus to attack and damage rolls made with these magic arrows. Once an arrow hits or misses, it loses its magic.' },
  { name: 'Arrows +3 (10)', category: 'adventuring-gear', subcategory: 'Ammunition', cost: '400 gp', weight: '½ lb.', rarity: 'very-rare', magical: true, bonus: 3, description: 'You have a +3 bonus to attack and damage rolls made with these magic arrows. Once an arrow hits or misses, it loses its magic.' },
  { name: 'Bolts +1 (10)', category: 'adventuring-gear', subcategory: 'Ammunition', cost: '25 gp', weight: '¾ lb.', rarity: 'uncommon', magical: true, bonus: 1, description: 'You have a +1 bonus to attack and damage rolls made with these magic bolts. Once a bolt hits or misses, it loses its magic.' },
  { name: 'Bolts +2 (10)', category: 'adventuring-gear', subcategory: 'Ammunition', cost: '100 gp', weight: '¾ lb.', rarity: 'rare', magical: true, bonus: 2, description: 'You have a +2 bonus to attack and damage rolls made with these magic bolts. Once a bolt hits or misses, it loses its magic.' },
  { name: 'Bolts +3 (10)', category: 'adventuring-gear', subcategory: 'Ammunition', cost: '400 gp', weight: '¾ lb.', rarity: 'very-rare', magical: true, bonus: 3, description: 'You have a +3 bonus to attack and damage rolls made with these magic bolts. Once a bolt hits or misses, it loses its magic.' },
  { name: 'Arrow of Slaying', category: 'adventuring-gear', subcategory: 'Ammunition', cost: '600 gp', weight: '—', rarity: 'very-rare', magical: true, description: 'An arrow designed to slay a particular type of creature. If it hits the target creature type, it must make a DC 17 Constitution saving throw, taking 6d10 extra piercing damage on a failed save, or half as much on a success. After dealing this extra damage, the arrow becomes nonmagical.' },
  { name: 'Unbreakable Arrow', category: 'adventuring-gear', subcategory: 'Ammunition', cost: '50 gp', weight: '—', rarity: 'common', magical: true, description: 'This arrow can\'t be broken, except when it is within an antimagic field. It is not consumed on use.' },
  { name: 'Walloping Arrows (10)', category: 'adventuring-gear', subcategory: 'Ammunition', cost: '50 gp', weight: '½ lb.', rarity: 'common', magical: true, description: 'A creature hit by this ammunition must succeed on a DC 10 Strength saving throw or be knocked prone.' },
  { name: 'Walloping Bolts (10)', category: 'adventuring-gear', subcategory: 'Ammunition', cost: '50 gp', weight: '¾ lb.', rarity: 'common', magical: true, description: 'A creature hit by this ammunition must succeed on a DC 10 Strength saving throw or be knocked prone.' },

  // ═══════════════════════════════════════════════
  // TOOLS
  // ═══════════════════════════════════════════════
  { name: 'Alchemist\'s Supplies', category: 'tool', subcategory: 'Artisan Tools', cost: '50 gp', weight: '8 lb.' },
  { name: 'Brewer\'s Supplies', category: 'tool', subcategory: 'Artisan Tools', cost: '20 gp', weight: '9 lb.' },
  { name: 'Calligrapher\'s Supplies', category: 'tool', subcategory: 'Artisan Tools', cost: '10 gp', weight: '5 lb.' },
  { name: 'Carpenter\'s Tools', category: 'tool', subcategory: 'Artisan Tools', cost: '8 gp', weight: '6 lb.' },
  { name: 'Cartographer\'s Tools', category: 'tool', subcategory: 'Artisan Tools', cost: '15 gp', weight: '6 lb.' },
  { name: 'Cobbler\'s Tools', category: 'tool', subcategory: 'Artisan Tools', cost: '5 gp', weight: '5 lb.' },
  { name: 'Cook\'s Utensils', category: 'tool', subcategory: 'Artisan Tools', cost: '1 gp', weight: '8 lb.' },
  { name: 'Glassblower\'s Tools', category: 'tool', subcategory: 'Artisan Tools', cost: '30 gp', weight: '5 lb.' },
  { name: 'Jeweler\'s Tools', category: 'tool', subcategory: 'Artisan Tools', cost: '25 gp', weight: '2 lb.' },
  { name: 'Leatherworker\'s Tools', category: 'tool', subcategory: 'Artisan Tools', cost: '5 gp', weight: '5 lb.' },
  { name: 'Mason\'s Tools', category: 'tool', subcategory: 'Artisan Tools', cost: '10 gp', weight: '8 lb.' },
  { name: 'Painter\'s Supplies', category: 'tool', subcategory: 'Artisan Tools', cost: '10 gp', weight: '5 lb.' },
  { name: 'Potter\'s Tools', category: 'tool', subcategory: 'Artisan Tools', cost: '10 gp', weight: '3 lb.' },
  { name: 'Smith\'s Tools', category: 'tool', subcategory: 'Artisan Tools', cost: '20 gp', weight: '8 lb.' },
  { name: 'Tinker\'s Tools', category: 'tool', subcategory: 'Artisan Tools', cost: '50 gp', weight: '10 lb.' },
  { name: 'Weaver\'s Tools', category: 'tool', subcategory: 'Artisan Tools', cost: '1 gp', weight: '5 lb.' },
  { name: 'Woodcarver\'s Tools', category: 'tool', subcategory: 'Artisan Tools', cost: '1 gp', weight: '5 lb.' },

  // Gaming Sets
  { name: 'Dice Set', category: 'tool', subcategory: 'Gaming Set', cost: '1 sp', weight: '—' },
  { name: 'Dragonchess Set', category: 'tool', subcategory: 'Gaming Set', cost: '1 gp', weight: '1/2 lb.' },
  { name: 'Playing Card Set', category: 'tool', subcategory: 'Gaming Set', cost: '5 sp', weight: '—' },
  { name: 'Three-Dragon Ante Set', category: 'tool', subcategory: 'Gaming Set', cost: '1 gp', weight: '—' },

  // Musical Instruments
  { name: 'Bagpipes', category: 'tool', subcategory: 'Musical Instrument', cost: '30 gp', weight: '6 lb.' },
  { name: 'Drum', category: 'tool', subcategory: 'Musical Instrument', cost: '6 gp', weight: '3 lb.' },
  { name: 'Dulcimer', category: 'tool', subcategory: 'Musical Instrument', cost: '25 gp', weight: '10 lb.' },
  { name: 'Flute', category: 'tool', subcategory: 'Musical Instrument', cost: '2 gp', weight: '1 lb.' },
  { name: 'Lute', category: 'tool', subcategory: 'Musical Instrument', cost: '35 gp', weight: '2 lb.' },
  { name: 'Lyre', category: 'tool', subcategory: 'Musical Instrument', cost: '30 gp', weight: '2 lb.' },
  { name: 'Horn', category: 'tool', subcategory: 'Musical Instrument', cost: '3 gp', weight: '2 lb.' },
  { name: 'Pan Flute', category: 'tool', subcategory: 'Musical Instrument', cost: '12 gp', weight: '2 lb.' },
  { name: 'Shawm', category: 'tool', subcategory: 'Musical Instrument', cost: '2 gp', weight: '1 lb.' },
  { name: 'Viol', category: 'tool', subcategory: 'Musical Instrument', cost: '30 gp', weight: '1 lb.' },

  // Other Tools
  { name: 'Disguise Kit', category: 'tool', subcategory: 'Other Tools', cost: '25 gp', weight: '3 lb.', description: 'Proficiency lets you add your proficiency bonus to ability checks to create visual disguises.' },
  { name: 'Forgery Kit', category: 'tool', subcategory: 'Other Tools', cost: '15 gp', weight: '5 lb.', description: 'Proficiency lets you add your proficiency bonus to ability checks to create physical forgeries.' },
  { name: 'Herbalism Kit', category: 'tool', subcategory: 'Other Tools', cost: '5 gp', weight: '3 lb.', description: 'Proficiency lets you add your proficiency bonus to checks for identifying or applying herbs. Required to create antitoxin and potions of healing.' },
  { name: 'Navigator\'s Tools', category: 'tool', subcategory: 'Other Tools', cost: '25 gp', weight: '2 lb.', description: 'Proficiency lets you chart a ship\'s course and follow navigation charts.' },
  { name: 'Poisoner\'s Kit', category: 'tool', subcategory: 'Other Tools', cost: '50 gp', weight: '2 lb.', description: 'Proficiency lets you add your proficiency bonus to checks for crafting or applying poisons.' },
  { name: 'Thieves\' Tools', category: 'tool', subcategory: 'Other Tools', cost: '25 gp', weight: '1 lb.', description: 'Proficiency lets you add your proficiency bonus to checks for disarming traps or opening locks.' },

  // ═══════════════════════════════════════════════
  // PACKS
  // ═══════════════════════════════════════════════
  { name: 'Burglar\'s Pack', category: 'pack', subcategory: 'Pack', cost: '16 gp', weight: '—', description: 'Includes a backpack, bag of 1,000 ball bearings, 10 feet of string, a bell, 5 candles, a crowbar, a hammer, 10 pitons, a hooded lantern, 2 flasks of oil, 5 days rations, a tinderbox, a waterskin, and 50 feet of hempen rope.' },
  { name: 'Diplomat\'s Pack', category: 'pack', subcategory: 'Pack', cost: '39 gp', weight: '—', description: 'Includes a chest, 2 cases for maps and scrolls, a set of fine clothes, a bottle of ink, an ink pen, a lamp, 2 flasks of oil, 5 sheets of paper, a vial of perfume, sealing wax, and soap.' },
  { name: 'Dungeoneer\'s Pack', category: 'pack', subcategory: 'Pack', cost: '12 gp', weight: '—', description: 'Includes a backpack, a crowbar, a hammer, 10 pitons, 10 torches, a tinderbox, 10 days of rations, a waterskin, and 50 feet of hempen rope.' },
  { name: 'Entertainer\'s Pack', category: 'pack', subcategory: 'Pack', cost: '40 gp', weight: '—', description: 'Includes a backpack, a bedroll, 2 costumes, 5 candles, 5 days of rations, a waterskin, and a disguise kit.' },
  { name: 'Explorer\'s Pack', category: 'pack', subcategory: 'Pack', cost: '10 gp', weight: '—', description: 'Includes a backpack, a bedroll, a mess kit, a tinderbox, 10 torches, 10 days of rations, a waterskin, and 50 feet of hempen rope.' },
  { name: 'Priest\'s Pack', category: 'pack', subcategory: 'Pack', cost: '19 gp', weight: '—', description: 'Includes a backpack, a blanket, 10 candles, a tinderbox, an alms box, 2 blocks of incense, a censer, vestments, 2 days of rations, and a waterskin.' },
  { name: 'Scholar\'s Pack', category: 'pack', subcategory: 'Pack', cost: '40 gp', weight: '—', description: 'Includes a backpack, a book of lore, a bottle of ink, an ink pen, 10 sheets of parchment, a little bag of sand, and a small knife.' },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  // Only remove non-magical (mundane) items to preserve magic items from seed-magic-items.js
  const existingMundane = await Equipment.countDocuments({ magical: { $ne: true } });
  if (existingMundane > 0) {
    console.log(`Removing ${existingMundane} mundane items and re-seeding...`);
    await Equipment.deleteMany({ magical: { $ne: true } });
  }

  await Equipment.insertMany(equipment);
  console.log(`Seeded ${equipment.length} mundane equipment items successfully!`);
  const total = await Equipment.countDocuments();
  console.log(`Total equipment in database: ${total}`);

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
