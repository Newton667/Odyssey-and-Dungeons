require('dotenv').config();
const mongoose = require('mongoose');
const Equipment = require('./models/Equipment');

const descriptions = {
  // ═══════════════════════════════════════════════
  // WEAPONS — Simple Melee
  // ═══════════════════════════════════════════════
  'Club': 'A stout piece of wood, sometimes wrapped in leather or studded with iron. Simple but effective in untrained hands.',
  'Dagger': 'A short blade used for close combat or throwing. Favored by rogues and spellcasters for its versatility and ease of concealment.',
  'Greatclub': 'A heavy two-handed club, often fashioned from a thick tree branch or reinforced with metal bands. Crude but devastating.',
  'Handaxe': 'A small, balanced axe designed for both melee combat and throwing. A common tool among woodsmen and warriors alike.',
  'Javelin': 'A light spear designed for throwing, with a weighted tip for better accuracy at range. Standard issue for many soldiers.',
  'Light Hammer': 'A small hammer balanced for both melee strikes and throwing. Often carried as a backup weapon by dwarven warriors.',
  'Mace': 'A heavy metal head mounted on a wooden or metal shaft. Favored by clerics, as it crushes without drawing blood.',
  'Quarterstaff': 'A versatile wooden staff about 6 feet long, wielded in one or two hands. The weapon of choice for monks and traveling wizards.',
  'Sickle': 'A short, curved blade originally designed for harvesting grain. Druids favor this weapon for its connection to the natural world.',
  'Spear': 'One of the oldest and most common weapons, consisting of a pointed tip on a long shaft. Effective when thrown or used with a shield.',

  // WEAPONS — Simple Ranged
  'Light Crossbow': 'A mechanical bow that uses a trigger mechanism to loose bolts. Easier to use than a traditional bow but slower to reload.',
  'Dart': 'A small, aerodynamic projectile with a weighted point. Light enough to carry many, accurate enough to be deadly.',
  'Shortbow': 'A compact bow made from a single piece of wood, effective at moderate range. Common among scouts, hunters, and halfling warriors.',
  'Sling': 'A leather pouch attached to two cords, used to hurl stones or bullets with surprising force. David slew Goliath with one of these.',

  // WEAPONS — Martial Melee
  'Battleaxe': 'A single-headed axe with a broad, heavy blade designed for cleaving through armor and shields. A staple of dwarven warfare.',
  'Flail': 'A striking head attached to a handle by a chain or hinge, allowing strikes to wrap around shields. Unpredictable and powerful.',
  'Glaive': 'A single-edged blade mounted on a long pole, combining reach with sweeping strikes. Favored by sentinels and honor guards.',
  'Greataxe': 'A massive double-headed or broad-bladed axe requiring two hands to wield. The favored weapon of barbarian warriors.',
  'Greatsword': 'A towering blade as tall as some who wield it. Requires tremendous strength but delivers devastating sweeping blows.',
  'Halberd': 'A versatile polearm featuring an axe blade, a spike, and a hook. Used to chop, thrust, and pull mounted riders from their steeds.',
  'Longsword': 'The quintessential knightly weapon — a straight, double-edged blade effective in one hand with a shield or gripped in two for greater force.',
  'Maul': 'An enormous hammer designed to crush armor like parchment. Requires immense strength but few strikes are needed to end a fight.',
  'Morningstar': 'A heavy, spiked metal ball mounted on a shaft. The spikes concentrate force into small points, punching through armor with ease.',
  'Pike': 'An extremely long spear, up to 20 feet, designed for fighting in formation. Keeps enemies at bay but unwieldy in tight quarters.',
  'Rapier': 'A thin, sharp-pointed blade optimized for thrusting attacks. The weapon of choice for duelists, swashbucklers, and fencing masters.',
  'Scimitar': 'A curved, single-edged blade designed for swift slashing attacks. Popular among desert warriors and sailors for its speed.',
  'Shortsword': 'A versatile blade shorter than a longsword but longer than a dagger. Ideal for fighting in tight spaces or dual-wielding.',
  'Trident': 'A three-pronged spear associated with aquatic deities and coastal warriors. Can be thrown or used to pin opponents.',
  'War Pick': 'A military pick with a heavy, pointed head designed to puncture heavy armor. Simple in design but brutally effective.',
  'Warhammer': 'A blunt weapon with a heavy head, designed to dent and crush armor. Popular among dwarves and clerics of martial gods.',
  'Whip': 'A long, flexible weapon capable of striking at a distance. Can trip, disarm, or lash opponents from 10 feet away.',

  // WEAPONS — Martial Ranged
  'Blowgun': 'A narrow tube through which darts are propelled by breath. Nearly silent, making it ideal for assassination and hunting.',
  'Hand Crossbow': 'A compact crossbow small enough to fire with one hand. Favored by assassins and drow warriors for its concealability.',
  'Heavy Crossbow': 'A powerful mechanical crossbow that launches bolts with tremendous force. Slow to reload but devastating on impact.',
  'Longbow': 'A tall bow nearly 6 feet in length, capable of striking targets at extreme range. The signature weapon of elven archers.',

  // ═══════════════════════════════════════════════
  // ADVENTURING GEAR
  // ═══════════════════════════════════════════════
  'Abacus': 'A calculating frame with beads on wires. Used by merchants, scholars, and anyone who needs to tally figures quickly.',
  'Bedroll': 'A portable sleeping mat that can be rolled up for travel. Essential for any adventurer sleeping under the stars.',
  'Bell': 'A small metal bell that produces a clear ring. Often tied to doors or tripwires as a simple alarm system.',
  'Blanket': 'A thick woolen blanket to ward off the cold during long rests in the wilderness.',
  'Book': 'A leather-bound tome of blank or written pages. Might contain lore, a journal, or arcane research notes.',
  'Bucket': 'A simple wooden or metal pail. Useful for carrying water, sand, or anything else an adventurer might need to haul.',
  'Case, Map or Scroll': 'A waterproof leather or bone tube that holds up to 10 rolled sheets of paper or 5 rolled sheets of parchment.',
  'Chalk (1 piece)': 'A stick of calcium used to mark surfaces. Adventurers use it to mark paths in dungeons or leave messages for allies.',
  'Clothes, Common': 'Simple, practical garments — a tunic, breeches, and a belt. The everyday wear of commoners throughout the realms.',
  'Clothes, Costume': 'An outfit suitable for a specific performance or disguise. May include wigs, makeup, and accessories.',
  'Clothes, Fine': 'Elegant garments of silk, velvet, or fine wool with tasteful embroidery. Suitable for audiences with nobility.',
  "Clothes, Traveler's": 'Durable, weather-resistant clothing designed for long journeys — sturdy boots, a cloak, and practical layers.',
  'Fishing Tackle': 'A kit containing a wooden rod, silken line, cork bobbers, steel hooks, lead sinkers, velvet lures, and narrow netting.',
  'Flask or Tankard': 'A metal or leather container for holding drink. Every tavern regular has a favorite.',
  'Grappling Hook': 'A multi-pronged iron hook designed to be tied to a rope and thrown to catch on ledges, walls, or branches.',
  'Hammer': 'A standard carpenter\'s hammer, useful for driving pitons into stone or nailing boards shut in a hurry.',
  'Hammer, Sledge': 'A massive two-handed hammer used for breaking through doors, walls, or anything else that stands in the way.',
  'Hourglass': 'A glass timepiece filled with fine sand, measuring the passage of approximately one hour.',
  'Ink (1 ounce bottle)': 'A small bottle of rich black ink suitable for writing. Wizards use vast quantities transcribing spells.',
  'Ink Pen': 'A thin writing implement tipped with a metal nib. Used with ink for scribing documents, scrolls, and letters.',
  'Jug or Pitcher': 'A ceramic or metal vessel for holding and pouring liquids. Holds about a gallon.',
  'Ladder (10-foot)': 'A sturdy wooden ladder. Heavy and awkward to carry but invaluable for scaling walls without magic or rope.',
  'Mess Kit': 'A tin box containing a cup, simple cutlery, and a small cooking pot nested together. Essential field dining.',
  'Mirror, Steel': 'A polished steel mirror about 6 inches across. Useful for looking around corners or signaling allies with reflected sunlight.',
  'Paper (one sheet)': 'A sheet of pressed plant fiber, smoother and more expensive than parchment. Preferred for formal correspondence.',
  'Parchment (one sheet)': 'A sheet of prepared animal skin used for writing. More durable than paper and the standard for scrolls.',
  'Perfume (vial)': 'A small glass vial of fragrant oil. Can mask the smell of a dungeon-crawler or help make a favorable impression.',
  "Pick, Miner's": 'A heavy tool for breaking rock and ore. In a pinch, it makes a serviceable if unwieldy weapon.',
  'Piton': 'An iron spike with an eye for threading rope. Hammered into cracks in rock or ice to create anchoring points for climbing.',
  'Pitons (10)': 'A bundle of ten iron climbing spikes. Essential equipment for scaling cliff faces and dungeon walls.',
  'Pole (10-foot)': 'A sturdy wooden pole, invaluable for prodding suspicious floors, pushing open doors from a distance, or vaulting gaps.',
  'Pot, Iron': 'A heavy iron cooking pot. Can also serve as a makeshift helmet in desperate circumstances.',
  'Rations (1 day)': 'Dry food suitable for travel — jerky, dried fruit, hardtack, and nuts. Not delicious, but sustaining.',
  'Rations (10 days)': 'Ten days of preserved travel food — salted meats, dried fruits, nuts, and hardtack packed for the road.',
  'Robes': 'Loose-fitting garments that drape from shoulder to ankle. The traditional dress of monks, scholars, and spellcasters.',
  "Scale, Merchant's": 'A small balance scale with weights, used to measure precious metals, gems, and trade goods.',
  'Sealing Wax': 'A stick of colored wax used to seal letters and documents with an official stamp. Melted over flame and pressed with a signet.',
  'Shovel': 'A broad-bladed digging tool. Useful for excavation, burial, or clearing rubble in collapsed passages.',
  'Signal Whistle': 'A small metal whistle that produces a shrill tone audible up to 600 feet away. Used for coordinating groups.',
  'Signet Ring': 'A ring engraved with a family crest, guild symbol, or personal mark. Used to stamp sealing wax on official documents.',
  'Soap': 'A cake of rendered fat and lye. A luxury in some parts of the world, a necessity for those who wish to remain civilized.',
  'Spikes, Iron (10)': 'Ten large iron spikes useful for jamming doors shut, creating footholds in walls, or anchoring ropes.',
  'Tent, Two-Person': 'A simple canvas shelter supported by poles, providing protection from rain and wind for two sleeping adventurers.',
  'Whetstone': 'A flat stone used to sharpen blades and maintain weapon edges. A few minutes with a whetstone keeps steel keen.',

  // Ammunition
  'Arrows (20)': 'A quiver of twenty wooden-shafted arrows with steel broadheads and fletched feathers. Standard ammunition for bows.',
  'Blowgun Needles (50)': 'Fifty thin steel needles for use with a blowgun. Often coated with poison for hunting or assassination.',
  'Crossbow Bolts (20)': 'Twenty short, heavy projectiles with iron tips designed for crossbows. More compact than arrows but hit just as hard.',
  'Sling Bullets (20)': 'Twenty shaped lead or stone bullets for use with a sling. Denser than rocks, they fly straighter and hit harder.',

  // ═══════════════════════════════════════════════
  // TOOLS — Artisan Tools
  // ═══════════════════════════════════════════════
  "Alchemist's Supplies": 'Two glass beakers, a metal frame to hold them, a glass stirring rod, a mortar and pestle, and a pouch of common alchemical ingredients.',
  "Brewer's Supplies": 'A large glass jug, hops, a siphon, tubing, and various ingredients for crafting ales, meads, and other fermented beverages.',
  "Calligrapher's Supplies": 'Ink, a dozen sheets of parchment, and three quills. Used to create beautiful handwritten documents and forgeries.',
  "Carpenter's Tools": 'A saw, hammer, nails, a hatchet, a square, a ruler, an adze, a plane, and a chisel for working with wood.',
  "Cartographer's Tools": 'A quill, ink, parchment, a pair of compasses, calipers, and a ruler for creating detailed maps.',
  "Cobbler's Tools": 'A hammer, awls, a knife, a shoe stand, a cutter, spare leather, and thread for crafting and repairing footwear.',
  "Cook's Utensils": 'A metal pot, knives, forks, a stirring spoon, and a ladle. Everything needed to prepare meals on the road.',
  "Glassblower's Tools": 'A blowpipe, a marver, blocks, and tweezers for shaping molten glass into bottles, vials, and decorative works.',
  "Jeweler's Tools": 'A small saw, hammer, files, pliers, tweezers, and a small magnifying lens for crafting and appraising jewelry.',
  "Leatherworker's Tools": 'A knife, a small mallet, an edge, a hole punch, thread, and leather scraps for working hides into goods.',
  "Mason's Tools": 'A trowel, hammer, chisel, brushes, and a square for cutting and shaping stone into walls, arches, and structures.',
  "Painter's Supplies": 'An easel, canvas, paints, brushes, ink, charcoal sticks, and a palette for creating works of art.',
  "Potter's Tools": 'Potter\'s needles, ribs, scrapers, a knife, and calipers for shaping clay into vessels and decorative pieces.',
  "Smith's Tools": 'Hammers, tongs, charcoal, rags, and a whetstone for forging and repairing metal arms and armor.',
  "Tinker's Tools": 'A variety of hand tools, thread, needles, a whetstone, scraps of cloth and leather, and a small pot of glue for repairs.',
  "Weaver's Tools": 'A loom, thread, needles, and scraps of cloth for creating and repairing textiles and garments.',
  "Woodcarver's Tools": 'A knife, a gouge, and a small saw for carving intricate designs in wood, from holy symbols to arrow shafts.',

  // TOOLS — Gaming Sets
  'Dice Set': 'A matched set of polyhedral dice, carved from bone or stone. Used for games of chance in taverns across the realms.',
  'Dragonchess Set': 'A complex strategy game played on three stacked boards representing the sky, land, and underworld. A favorite of nobles and wizards.',
  'Playing Card Set': 'A deck of illustrated cards used for games of bluff and strategy. The designs vary by region and culture.',
  'Three-Dragon Ante Set': 'A popular card game where players bid and bluff using cards depicting chromatic and metallic dragons.',

  // TOOLS — Musical Instruments
  'Bagpipes': 'A wind instrument with multiple pipes and a leather bag for air supply. Its droning call carries across battlefields and highlands.',
  'Drum': 'A hollow cylinder with a stretched membrane head, struck with sticks or hands. Used to keep marching rhythm or celebrate victories.',
  'Dulcimer': 'A stringed instrument played by striking the strings with small hammers. Produces a sweet, resonant tone favored by bards.',
  'Flute': 'A slender woodwind instrument that produces a clear, high-pitched melody. Compact enough to play while walking.',
  'Horn': 'A brass or bone instrument that produces a bold, carrying tone. Used for signals in war and hunting, or festive music.',
  'Lute': 'A plucked string instrument with a rounded body. The bard\'s classic companion, capable of ballads, jigs, and dirges alike.',
  'Lyre': 'A stringed instrument with a U-shaped frame, plucked to produce ethereal melodies. Associated with divine and fey music.',
  'Pan Flute': 'A set of graduated pipes bound together, played by blowing across the tops. Associated with satyrs and woodland sprites.',
  'Shawm': 'A double-reed woodwind instrument with a loud, penetrating tone. Often heard at festivals and military ceremonies.',
  'Viol': 'A bowed string instrument held between the knees. Produces a rich, warm tone suitable for courts and concert halls.',
};

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  let updated = 0;
  for (const [name, description] of Object.entries(descriptions)) {
    const result = await Equipment.updateMany(
      { name, $or: [{ description: '' }, { description: { $exists: false } }] },
      { $set: { description } }
    );
    if (result.modifiedCount > 0) {
      updated += result.modifiedCount;
    }
  }

  console.log(`Updated ${updated} items with descriptions.`);

  // Check remaining
  const remaining = await Equipment.countDocuments({ $or: [{ description: '' }, { description: { $exists: false } }] });
  console.log(`Items still without descriptions: ${remaining}`);

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
