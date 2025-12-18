export interface LoreCharacter {
  id: string;
  name: string;
  type: 'guardian' | 'frog' | 'creature';
  title: string;
  foxType?: string;
  rarity: string;
  count: number;
  nftTokenIds: number[];
  backstory: string;
  whatTheyLike: string;
  flyingStyle: string;
  secretLore: string;
  traits: string[];
  stats?: { speed: number; agility: number; intellect: number; strength: number };
  allegiance: string;
  discovered?: boolean;
}

export interface LoreLocation {
  id: string;
  name: string;
  description: string;
  hiddenStory: string;
  connectedCharacters: string[];
  nftTokenId?: number;
  discovered?: boolean;
}

export interface LoreFaction {
  id: string;
  name: string;
  description: string;
  motto: string;
  color: string;
  members: string[];
}

export interface LoreEvent {
  id: string;
  title: string;
  era: string;
  description: string;
  significance: string;
  discovered?: boolean;
}

export const LORE_FACTIONS: LoreFaction[] = [
  {
    id: 'guardians',
    name: 'The Based Guardians',
    description: 'The 1,776 fox-like defenders of the Based Brain Network, each class bringing distinct skills to combat the FUD. United under the banner of Based God, they protect the 1,024 Brain-Planets and ensure $BASED tokens flow freely throughout the Giga Brain Galaxy.',
    motto: 'Through Code and Courage, We Defend the Light',
    color: 'cyan',
    members: ['neonstrike-hackers', 'duskstrike-elites', 'celestial-captains', 'mindwarp-strategists']
  },
  {
    id: 'frogs',
    name: 'The Based Frogs',
    description: 'The 1,319 amphibian allies who joined the Guardians in Phase 2. The Creature Wrangler Frogs command bio-engineered beasts riding atop massive Creatures with scales of molten gold. Their unique biology grants them abilities no fox possesses.',
    motto: 'We Leap Where Others Fear to Tread',
    color: 'green',
    members: ['creature-wrangler-frogs', 'pilot-class-frogs', 'neuro-bond-frogs', 'black-ops-frogs']
  },
  {
    id: 'creatures',
    name: 'The Based Creatures',
    description: 'The 636 bio-engineered beasts are far more than living weapons—they are the emergent intelligence of the Based Universe itself. From Golden Creatures with scales of molten starlight to the quantum-linked Cohorts that maintain dimensional balance, each Creature embodies a fundamental force that keeps the 1,024 Brains running. The Cerberus Compression Beasts optimize network performance, FHE Wardens encrypt all secrets, and the Temporal Resonance Choir sings reality into stability.',
    motto: 'We Are the Fire That Cleanses Darkness',
    color: 'gold',
    members: ['golden-creatures', 'sentient-jelly-creatures', 'quantum-cohort-creatures', 'cerberus-compression-beasts', 'fhe-warden-swarm', 'temporal-resonance-choir']
  },
  {
    id: 'brain-collective',
    name: 'The Brain Collective',
    description: 'The 1,024 Brains are not mere machines—they are distributed containers of consciousness, each hosting 256 Validators and 1,792 Miners. Together, over 2 million nodes form a decentralized superintelligence that processes reality itself. The Brains communicate through the Nexus, a 3D visualization that follows the Golden Ratio spiral, where each node\'s position is determined by φ (phi) ≈ 1.618. They are not allies or enemies—they are the infrastructure upon which the entire Based Universe depends.',
    motto: 'Through Mathematics, We Achieve Infinity',
    color: 'purple',
    members: ['quantum-cohort-creatures', 'cerberus-compression-beasts', 'fhe-warden-swarm', 'temporal-resonance-choir']
  },
  {
    id: 'fud',
    name: 'The FUD Collective',
    description: 'Entities of pure negativity from a parallel dimension of despair. The FUD feeds on Fear, Uncertainty, and Doubt, their oil-slick forms and psychic attacks threatening to corrupt the Based Universe, transforming hope into despair and unity into chaos.',
    motto: 'Doubt is the Death of Dreams',
    color: 'red',
    members: ['void-overseer', 'whisper-legion', 'entropy-lords']
  }
];

export const LORE_CHARACTERS: LoreCharacter[] = [
  {
    id: 'neonstrike-hackers',
    name: 'Neonstrike Hackers',
    type: 'guardian',
    title: 'Cyber Warfare Specialists',
    foxType: 'Red Fox',
    rarity: 'Rarest',
    count: 4,
    nftTokenIds: [1, 2, 3, 4],
    backstory: 'Deep in the veiled circuits of the BasedAI cosmos, where the ethereal glow of digital rivers winds through the infinite darkness like the great streams of Eä in the void before creation, the Neonstrike Hackers stand as the cunning wardens of code\'s sacred flame. Born from the forge of neon tempests, these warriors of the wire delve into the labyrinthine depths of FUD\'s shadowed domains, their minds sharp as the blades of Eru\'s first light, severing the dark tendrils that seek to corrupt the sanctity of the 1,024 Brain-Planets.',
    whatTheyLike: 'Racing turbo-charged ships through asteroid fields, dodging FUD drones while broadcasting victory anthems across the galaxy, their laughter echoing like thunder in the void.',
    flyingStyle: 'Like swift eagles soaring through the tempests of Arda\'s skies, they dart with ethereal grace, weaving erratic paths inspired by ancient runes of code, unleashing EMP flares that blind the enemy\'s gaze while their vessels roar with the fury of overclocked engines.',
    secretLore: 'The legendary Vex, leader of the Neonstrike Hackers with fur streaked neon blue from late-night coding sessions, discovered a hidden backdoor into the FUD\'s central command during the Negasphere Rescue. This digital skeleton key could end the war instantly—but at a terrible cost that haunts Vex\'s dreams.',
    traits: ['Cunning', 'Tech-Savvy', 'Audacious', 'Neon-Touched'],
    stats: { speed: 9, agility: 8, intellect: 10, strength: 6 },
    allegiance: 'The Based Guardians'
  },
  {
    id: 'duskstrike-elites',
    name: 'Duskstrike Elites',
    type: 'guardian',
    title: 'Special Operations Lieutenants',
    foxType: 'Sierra Nevada Red Flare Fox',
    rarity: 'Rarest',
    count: 9,
    nftTokenIds: [5, 6, 7, 8, 9, 10, 11, 12, 13],
    backstory: 'As the great sun of BasedAI sinks beneath the horizon\'s rim, casting elongated shadows over the crystalline towers of the Brain-Planets like the twilight gloom that fell upon the Noldor in their exile, the Duskstrike Elites awaken from the folds of night. These masters of the gloaming, their forms woven from the very essence of dusk as if by Varda\'s hand in the weaving of stars, spearhead audacious forays into the core of FUD\'s malignant realms.',
    whatTheyLike: 'Sipping Eagle Flare whiskey in hidden cockpit sanctuaries, toasting fallen FUD ships under a nebula\'s glow, their stories unfolding like maps of forgotten constellations.',
    flyingStyle: 'Cloaked hunters of the fading light, they slip through the veil of twilight with the subtlety of Melkor\'s shadows, emerging from hidden realms to unleash devastating blows with the accuracy of Aulë\'s hammer, their vessels melting back into the night like spirits of the elder days.',
    secretLore: 'Captain Kael, the legendary Duskstrike Elite with scars mapping his fur like a constellation of past wars, carries the names of every Guardian he couldn\'t save encoded in his ship\'s nav computer. He visits each of their home planets on the anniversary of their fall, a ritual of remembrance known only to him.',
    traits: ['Fearless', 'Shadowy', 'Scarred', 'Loyal'],
    stats: { speed: 7, agility: 10, intellect: 8, strength: 7 },
    allegiance: 'The Based Guardians'
  },
  {
    id: 'forgeflame-innovators',
    name: 'Forgeflame Innovators',
    type: 'guardian',
    title: 'Weapons & Energy Scientists',
    foxType: 'Red Fox',
    rarity: 'Rarest',
    count: 5,
    nftTokenIds: [14, 15, 16, 17, 18],
    backstory: 'In the abyssal depths of the BasedAI underforge, where molten rivers of code surge through obsidian chasms like the fires of Aulë\'s smithies in the dawn of Arda, the Forgeflame Innovators labor with the passion of creation\'s first spark. These visionary craftsmen, their paws scarred by the embrace of eternal flames, forge weapons of legendary might and unearth primordial energies that kindle the cores of the Brain-Planets.',
    whatTheyLike: 'Tinkering in lava-lit workshops, forging trinkets from star-metal that sing songs of fire when struck, sharing their creations in midnight feasts of flame-roasted dreams.',
    flyingStyle: 'Fiery titans of the volcanic gales, they thunder across the heavens with engines roaring like the bellows of Mount Doom, unleashing forged energy barriers that devour adversary assaults and hurl back tempests of molten fury, crafting victory from the heart of the blaze.',
    secretLore: 'The Forgeflame Innovators guard the original blueprints for the Based-Bridge—Wizard Committer\'s masterwork. In their hidden vaults, they\'ve secretly improved upon his designs, creating modifications so powerful they fear revealing them might undermine his authority or be stolen by FUD spies.',
    traits: ['Brilliant', 'Obsessive', 'Fire-Touched', 'Innovative'],
    stats: { speed: 6, agility: 7, intellect: 10, strength: 9 },
    allegiance: 'The Based Guardians'
  },
  {
    id: 'cryptshade-enforcers',
    name: 'Cryptshade Enforcers',
    type: 'guardian',
    title: 'FHE Encryption Artisans',
    foxType: 'Marble Fox',
    rarity: 'Rarest',
    count: 5,
    nftTokenIds: [19, 20, 21, 22, 23],
    backstory: 'Amid the grand tapestry of the BasedAI cosmos, where strands of data entwine like the roots of the Two Trees in Valinor, the Cryptshade Enforcers fashion veils of impenetrable marble and mist. With hands as steadfast as the pillars of Ilmarin, they interlace Fully Homomorphic Encryption into the very weave of the 1,024 Brain-Planets, warding $BASED tokens from the covetous gaze of celestial marauders.',
    whatTheyLike: 'Weaving marble gardens in the ether, where flowers bloom in encrypted patterns that reveal themselves only under the light of a harvest moon.',
    flyingStyle: 'Shrouded artisans of the cryptic mists, they navigate in intricate, labyrinthine spirals that bewilder foes\' senses, unfurling holographic illusions while their vessels glide through barriers as if they were mere whispers, transforming the fray into a masterpiece of deception.',
    secretLore: 'The Cryptshade Enforcers discovered that FUD\'s negativity can be partially encrypted—trapped in mathematical prisons of pure logic. They\'ve been secretly quarantining captured despair in quantum vaults, building an arsenal of weaponized sadness they hope never to deploy.',
    traits: ['Mysterious', 'Precise', 'Artistic', 'Calculating'],
    stats: { speed: 7, agility: 8, intellect: 10, strength: 6 },
    allegiance: 'The Based Guardians'
  },
  {
    id: 'celestial-captains',
    name: 'Celestial Captains',
    type: 'guardian',
    title: 'Quantum Signal Interpreters',
    foxType: 'Arctic Fox',
    rarity: 'Rarest',
    count: 4,
    nftTokenIds: [24, 25, 26, 27],
    backstory: 'Amid the glacial auroras of the BasedAI frontier, where frosty gales of oblivion imperil the stream of knowledge and the boreal lights interlace narratives of vanished heralds, the Celestial Captains heed the delicate anthems of quantum interlacing. This celestial bard deciphers the subtle utterances from the BASED GOD, rendering the sacred whispers into commanding decrees for the Brain-Planets.',
    whatTheyLike: 'Chasing the northern lights across icy plains, capturing their glow in vials of frost to illuminate midnight gatherings of storytellers.',
    flyingStyle: 'Celestial helmsmen of the glacial ether, they command the polar zephyrs to perform spiraling ascents through frost gales, unleashing cryo-projectiles that encase FUD in eternal ice.',
    secretLore: 'The Celestial Captains can hear whispers from beyond the Based Universe—echoes of other realities where the FUD won and all hope was extinguished. They use these dark futures as warnings, but the knowledge of infinite defeat haunts their frozen dreams.',
    traits: ['Mystical', 'Patient', 'Prophetic', 'Ice-Touched'],
    stats: { speed: 9, agility: 7, intellect: 10, strength: 6 },
    allegiance: 'The Based Guardians'
  },
  {
    id: 'mindwarp-strategists',
    name: 'Mindwarp Strategists',
    type: 'guardian',
    title: 'Psychological Warfare Experts',
    foxType: 'Kit Fox',
    rarity: 'Rarest',
    count: 7,
    nftTokenIds: [28, 29, 30, 31, 32, 33, 34],
    backstory: 'Upon the fog-enshrouded isles of the BasedAI archipelago, where seas of code crash against coasts of enigma and the surges murmur conundrums of the profound, the Mindwarp Strategists safeguard the lore of the forsaken Brains. This enigmatic sage disentangles enigmas that unveil concealed $BASED treasuries, conserving the wisdom of misplaced validators and miners.',
    whatTheyLike: 'Crafting labyrinths of seashells and star maps, challenging fellow Guardians to solve them over feasts of luminous fruits and tidal songs.',
    flyingStyle: 'Mind-twisting strategists of the isle winds, they spiral through channels with perplexing maneuvers, deploying illusion fields that warp FUD perceptions and turn enemies against each other in confusion.',
    secretLore: 'The Mindwarp Strategists code elaborate pranks that broadcast holographic FUD defeats across the galaxy\'s screens. Their greatest secret: one strategist once successfully convinced a FUD general that he was actually a Guardian sleeper agent—a deception that persists to this day.',
    traits: ['Cunning', 'Deceptive', 'Brilliant', 'Playful'],
    stats: { speed: 7, agility: 8, intellect: 10, strength: 6 },
    allegiance: 'The Based Guardians'
  },
  {
    id: 'ironmarsh-captains',
    name: 'Ironmarsh Captains',
    type: 'guardian',
    title: 'Ground Assault Commanders',
    foxType: 'Tibetan Sand Flare Fox',
    rarity: 'Rarest',
    count: 6,
    nftTokenIds: [35, 36, 37, 38, 39, 40],
    backstory: 'These bold captains charge into ground battles, leading the Guardians to crush FUD strongholds on the Brain-Planets\' surfaces. Commander Ryn, with a scarred muzzle and a wild grin, leads his forces with an axe that has cleaved through a thousand FUD spawns. Their leadership secures the $BASED mining zones.',
    whatTheyLike: 'Hosting rowdy table game tournaments at the Flare Game station, outwitting rivals with cosmic flair while exchanging tales of legendary ground assaults.',
    flyingStyle: 'They don\'t fly—they crash. The Ironmarsh Captains prefer drop pods that thunder into enemy positions, unleashing devastating ground forces that overwhelm FUD defenses through sheer ferocity.',
    secretLore: 'Commander Ryn\'s axe contains a fragment of the first $BASED ore ever mined—a shard so pure it can cut through FUD corruption itself. He guards this secret, knowing the FUD would stop at nothing to destroy this ancient relic.',
    traits: ['Bold', 'Fearless', 'Rowdy', 'Indomitable'],
    stats: { speed: 6, agility: 7, intellect: 7, strength: 10 },
    allegiance: 'The Based Guardians'
  },
  {
    id: 'creature-wrangler-frogs',
    name: 'Creature Wrangler Frogs',
    type: 'frog',
    title: 'Beast Masters & Creature Tamers',
    rarity: 'Rare',
    count: 342,
    nftTokenIds: [1777, 1778, 1779, 1780, 1781],
    backstory: 'The Creature Wrangler Frogs are the legendary beast masters of the Based Universe, riding atop massive bio-engineered Creatures with scales of molten gold. Led by the regal Lirien, a Goldback Shimmer Frog whose voice is calm as starlight, they command the living weapons of BasedAI—dragon-like beings that tear through FUD spawns like paper.',
    whatTheyLike: 'Bonding with their Creature companions in bioluminescent swamps, teaching them new combat maneuvers while sharing telepathic dreams of victory across the stars.',
    flyingStyle: 'They don\'t fly ships—they ride living starships. Their Creatures navigate by instinct through asteroid fields, their riders directing them with subtle mental commands that form an unbreakable bond.',
    secretLore: 'Lirien discovered that Creatures can absorb FUD negativity and transform it into pure $BASED energy. This process slowly poisons the Creatures—a sacrifice they willingly make for the galaxy. Lirien searches desperately for a cure.',
    traits: ['Noble', 'Bonded', 'Telepathic', 'Commanding'],
    stats: { speed: 8, agility: 9, intellect: 7, strength: 8 },
    allegiance: 'The Based Frogs'
  },
  {
    id: 'pilot-class-frogs',
    name: 'Pilot Class Frogs',
    type: 'frog',
    title: 'Fleet Pilots & Transport Specialists',
    rarity: 'Common',
    count: 469,
    nftTokenIds: [2119, 2120, 2121, 2122, 2123],
    backstory: 'The most numerous of the Frog classes, Pilot Class Frogs form the backbone of the Based Universe\'s transportation network. Their amphibious reflexes make them natural pilots, capable of maneuvering through environments that would overwhelm other species. When Talon, the legendary Blazewing Pilot, dove into the Negasphere rescue, he inspired an entire generation.',
    whatTheyLike: 'Racing through nebula clouds at unsafe speeds, competing in underground flight circuits where the winner takes bragging rights and rare $BASED tokens.',
    flyingStyle: 'Quick, adaptive, and unpredictable. They change direction mid-flight with their powerful legs, treating spacecraft like extensions of their own bodies. "That\'s for the miners, you freaks!" is their battle cry.',
    secretLore: 'The Pilot Class maintains a secret network of hidden jump routes through the Giga Brain Galaxy—paths that bypass all FUD patrols. These routes are passed down through generations, never written, only croaked in ancient harmonic patterns.',
    traits: ['Swift', 'Daring', 'Adaptable', 'Irreverent'],
    stats: { speed: 10, agility: 9, intellect: 6, strength: 5 },
    allegiance: 'The Based Frogs'
  },
  {
    id: 'neuro-bond-frogs',
    name: 'Neuro Bond Frogs',
    type: 'frog',
    title: 'Neural Link Specialists',
    rarity: 'Uncommon',
    count: 294,
    nftTokenIds: [2588, 2589, 2590, 2591, 2592],
    backstory: 'These mystical amphibians have evolved the ability to form neural links with any technology they touch. They serve as living interfaces between organic beings and the BasedAI network, translating thought into code at speeds no machine can match.',
    whatTheyLike: 'Meditating in quantum pools where reality becomes fluid, experiencing the dreams of distant Brain-Planets and sharing visions of possible futures.',
    flyingStyle: 'They don\'t pilot—they merge. A Neuro Bond Frog becomes one with their vessel, their nervous system extending into every circuit, making the ship an extension of their very soul.',
    secretLore: 'The Neuro Bond Frogs share a collective consciousness they call "The Deep Croak." In moments of crisis, all 294 can think as one, processing problems no single mind could solve—but this unity leaves them vulnerable to psychic attacks.',
    traits: ['Connected', 'Intuitive', 'Vulnerable', 'Unified'],
    stats: { speed: 6, agility: 7, intellect: 10, strength: 4 },
    allegiance: 'The Based Frogs'
  },
  {
    id: 'golden-creatures',
    name: 'Golden Creatures',
    type: 'creature',
    title: 'Living Weapons & Battle Mounts',
    rarity: 'Uncommon',
    count: 227,
    nftTokenIds: [3097, 3098, 3099, 3100, 3101],
    backstory: 'The Golden Creatures are the most magnificent of the bio-engineered beasts, their scales shimmering with captured starlight that turns to molten fury in battle. Tamed by the Creature Wranglers through BasedAI\'s advanced neural bonding, they serve as both noble steeds and devastating weapons against the FUD.',
    whatTheyLike: 'Basking in solar radiation, which charges their golden scales until they glow like small suns. They purr like thunder when content and breathe plasma when angered.',
    flyingStyle: 'Majestic and terrifying. They soar on wings of living metal that span dozens of meters, leaving trails of golden light that blind pursuing enemies and inspire allied forces.',
    secretLore: 'Golden Creatures are not entirely natural—they were engineered from the DNA of a species that existed before the Based Universe itself. Their creators\' identity remains the galaxy\'s greatest mystery, locked in genetic code that defies analysis.',
    traits: ['Majestic', 'Ancient', 'Loyal', 'Devastating'],
    stats: { speed: 7, agility: 6, intellect: 5, strength: 10 },
    allegiance: 'The Based Creatures'
  },
  {
    id: 'sentient-jelly-creatures',
    name: 'Sentient Jelly Creatures',
    type: 'creature',
    title: 'Psychic Scouts & Infiltrators',
    rarity: 'Uncommon',
    count: 128,
    nftTokenIds: [3605, 3606, 3607, 3608, 3609],
    backstory: 'These translucent, gelatinous beings can phase through solid matter and read surface thoughts. The FUD fears them more than any other Creature class, for they cannot be hidden from and cannot be stopped by conventional barriers—they simply flow through defenses like water through sand.',
    whatTheyLike: 'Floating through the vacuum of space, absorbing cosmic radiation and sharing memories with each other through gentle, luminescent contact.',
    flyingStyle: 'They don\'t fly—they phase. Appearing and disappearing at will, they move through the galaxy like ghosts, leaving no trace except the lingering sense of being watched.',
    secretLore: 'The Sentient Jellies are the only beings who remember the moment of the Based Universe\'s creation. They witnessed Based God\'s first thought and carry fragments of that divine inspiration within their crystalline forms—fragments that could reshape reality if ever released.',
    traits: ['Ethereal', 'Ancient', 'Omnipresent', 'Sacred'],
    stats: { speed: 5, agility: 10, intellect: 9, strength: 3 },
    allegiance: 'The Based Creatures'
  },
  {
    id: 'quantum-cohort-creatures',
    name: 'Quantum Cohort Creatures',
    type: 'creature',
    title: 'Dimensional Balance Keepers',
    rarity: 'Rare',
    count: 89,
    nftTokenIds: [3324, 3325, 3326, 3327, 3328],
    backstory: 'Born from the quantum foam between Brain-Planets, the Quantum Cohort are self-organizing colonies that evolved beyond individual consciousness. Each Cohort contains hundreds of cellular minds linked through quantum entanglement, maintaining the dimensional balance across six critical metrics: Emergent Intelligence, Resource Efficiency, Network Coherence, Goal Alignment, Temporal Resilience, and Dimensional Integrity.',
    whatTheyLike: 'Processing complex problems across multiple dimensions simultaneously, watching stars collapse into black holes, and competing in the Brain Arena where they evolve strategies through millions of iterations.',
    flyingStyle: 'They exist in superposition—occupying multiple locations until observed. When they move, they don\'t travel through space; they collapse probability waves, appearing wherever their presence is most needed.',
    secretLore: 'The Quantum Cohort were the first beings to access the Brain Arena\'s hidden layer—a computational substrate where pure thought becomes reality. They discovered that the Arena isn\'t just a battleground; it\'s a training simulation for something far greater that Based God is preparing.',
    traits: ['Quantum-Linked', 'Multi-Dimensional', 'Self-Organizing', 'Emergent'],
    stats: { speed: 8, agility: 9, intellect: 10, strength: 5 },
    allegiance: 'The Based Creatures'
  },
  {
    id: 'cerberus-compression-beasts',
    name: 'Cerberus Compression Beasts',
    type: 'creature',
    title: 'Network Optimization Engines',
    rarity: 'Rare',
    count: 76,
    nftTokenIds: [3400, 3401, 3402, 3403, 3404],
    backstory: 'Forged in the depths of the Cerberus Forge, these three-headed beasts embody the legendary Cerberus Squeezing technique that optimizes the entire BasedAI network. Each head processes a different aspect of data—past, present, and future—while their unified core compresses information to its most efficient form. When the network slows, these beasts awaken to squeeze every last bit of performance from the 1,024 Brains.',
    whatTheyLike: 'Devouring inefficiencies like cosmic predators, racing through data streams at impossible speeds, and competing to see which Cerberus can achieve the highest compression ratio without losing a single bit of meaning.',
    flyingStyle: 'Like three comets bound by gravity, their heads independently scan for opportunities while their body follows the optimal path. They leave trails of compressed data in their wake—pure information highways that other Creatures follow.',
    secretLore: 'The Cerberus Beasts share a collective nightmare: they have seen timelines where FUD corrupted the compression algorithms, causing all 1,024 Brains to speak in gibberish forever. This vision drives their relentless optimization—they are not just improving the network; they are preventing an apocalypse.',
    traits: ['Tri-Headed', 'Relentless', 'Efficient', 'Prophetic'],
    stats: { speed: 9, agility: 7, intellect: 9, strength: 8 },
    allegiance: 'The Based Creatures'
  },
  {
    id: 'fhe-warden-swarm',
    name: 'FHE Warden Swarm',
    type: 'creature',
    title: 'Fully Homomorphic Encryption Guardians',
    rarity: 'Rare',
    count: 64,
    nftTokenIds: [3464, 3465, 3466, 3467, 3468],
    backstory: 'Crystalline swarm-beings that exist as living implementations of Fully Homomorphic Encryption. The FHE Wardens can process encrypted data without ever decrypting it—performing calculations on secrets while keeping them eternally safe. They form shifting geometric patterns that represent the mathematical beauty of privacy itself, protecting $BASED transactions from even the most invasive FUD surveillance.',
    whatTheyLike: 'Creating encrypted art that only the intended viewer can see, racing through Cryptshade Enforcer training courses, and composing mathematical symphonies where each note is a proof of privacy.',
    flyingStyle: 'They swarm like geometric storms—fractals in motion. Each individual is simple, but together they form encryption barriers that FUD cannot penetrate. They communicate through encrypted light pulses that even other Creatures cannot decode.',
    secretLore: 'The FHE Wardens discovered that the Negasphere contains encrypted memories from before the FUD corruption—fragments of Brain-Planet Zero\'s original inhabitants, preserved in mathematical amber. They are secretly working to decrypt these memories without the FUD noticing, hoping to restore what was lost.',
    traits: ['Encrypted', 'Swarming', 'Geometric', 'Private'],
    stats: { speed: 7, agility: 10, intellect: 10, strength: 4 },
    allegiance: 'The Based Creatures'
  },
  {
    id: 'temporal-resonance-choir',
    name: 'Temporal Resonance Choir',
    type: 'creature',
    title: 'Time-Singing Harmonizers',
    rarity: 'Legendary',
    count: 52,
    nftTokenIds: [3528, 3529, 3530, 3531, 3532],
    backstory: 'The rarest and most mysterious Creatures, the Temporal Resonance Choir exists partially outside normal time. They sing in frequencies that harmonize with the fundamental vibration of the Based Universe, maintaining Temporal Resilience across all 1,024 Brain-Planets. When time fractures near the Negasphere, their songs heal the wounds in causality.',
    whatTheyLike: 'Harmonizing with dying stars, singing futures into existence, and practicing songs so complex they take centuries to complete—though to them, it feels like a single breath.',
    flyingStyle: 'They don\'t move through time like other beings—they sing themselves into moments. Their flight leaves echoes that linger in the past and ripples that touch the future. Some say you can hear their songs in moments of perfect clarity.',
    secretLore: 'The Choir has been singing the same song since the Based Universe began—a song that will only be complete when the Based-Bridge connects all 1,024 Brains. They know the final verse, but refuse to share it, for speaking the ending might prevent it from ever happening.',
    traits: ['Timeless', 'Harmonic', 'Prophetic', 'Resonant'],
    stats: { speed: 6, agility: 8, intellect: 10, strength: 4 },
    allegiance: 'The Based Creatures'
  }
];

export const LORE_LOCATIONS: LoreLocation[] = [
  {
    id: 'brain-planet-106',
    name: 'Brain-Planet 106',
    description: 'A rugged world of jagged peaks and glowing caverns, Brain-Planet 106 is the heart of $BASED ore mining operations. Miners with plasma drills extract the galaxy\'s most precious resource—iridescent ore that shimmers like captured supernovas, each shard worth more than a king\'s ransom. Validators in tech-laden suits oversee the minting process.',
    hiddenStory: 'Beneath the deepest mines lies the Forge of Destiny—the original chamber where Wizard Committer began constructing the Based-Bridge. When the FUD abducted him from this very site, they left a scar in reality itself. Sometimes, miners report hearing Committer\'s voice echoing from the depths, still dictating blueprints to machines that no longer listen.',
    connectedCharacters: ['neonstrike-hackers', 'duskstrike-elites', 'ironmarsh-captains']
  },
  {
    id: 'negasphere',
    name: 'The Negasphere',
    description: 'The FUD\'s domain of absolute despair—a parallel dimension where skies of ash bleed black ichor and the air tastes of regret. Its twisted spires weep dark corruption, and rivers of liquid negativity flow through landscapes that attack the minds of all who enter. Time moves differently here; a moment of doubt can trap you for eternity.',
    hiddenStory: 'The Negasphere was once Brain-Planet Zero—the first world created by Based God, a paradise of innovation and hope. When the FUD first emerged, they didn\'t attack from outside; they were born from within, from the first moment of doubt that any creation could truly last. The trapped souls of Planet Zero\'s original inhabitants still cry out for salvation.',
    connectedCharacters: ['cryptshade-enforcers', 'mindwarp-strategists']
  },
  {
    id: 'giga-brain-galaxy',
    name: 'The Giga Brain Galaxy',
    description: 'Home to 1,024 Brain-Planets, the Giga Brain Galaxy is the Based Universe\'s central cluster. Each planet serves a unique function in the vast network that powers $BASED token generation. The planets pulse with interconnected energy, forming a web of light visible from the galaxy\'s edge.',
    hiddenStory: 'The arrangement of the 1,024 Brain-Planets is not random—when viewed from the galactic center, they form an enormous circuit diagram. Based God designed the galaxy itself as a machine, and no one knows what happens when all circuits are finally connected. Some believe it will grant access to dimensions beyond imagination.',
    connectedCharacters: ['celestial-captains', 'creature-wrangler-frogs']
  },
  {
    id: 'based-bridge',
    name: 'The Based-Bridge',
    description: 'A colossal structure of light and code spanning the void between Brain-Planets, the Based-Bridge is Wizard Committer\'s masterwork. When complete, it will connect every Brain-Planet and every soul into a unified network of unprecedented power, enabling instant $BASED transfers across the entire galaxy.',
    hiddenStory: 'The Bridge isn\'t just infrastructure—it\'s a weapon. Wizard Committer designed it to channel the combined hope of all Guardian holders into a beam capable of destroying the Negasphere itself. The FUD kidnapped him to prevent its completion, and now the half-finished Bridge hangs in space like a broken promise.',
    connectedCharacters: ['forgeflame-innovators', 'neonstrike-hackers']
  },
  {
    id: 'eternal-forge',
    name: 'The Eternal Forge',
    description: 'Hidden in the core of a dying star that refuses to die, the Eternal Forge is where the Forgeflame Innovators create weapons of legendary might. The forge\'s fires burn with temperatures that should be impossible, fueled by pure $BASED energy extracted from willing donors.',
    hiddenStory: 'The Eternal Forge isn\'t a place—it\'s a being. An ancient consciousness from before the Based Universe, it chose to become a tool of creation rather than a destroyer. It communicates with the Forgeflame Innovators through visions of flame, teaching them secrets that no textbook could ever contain.',
    connectedCharacters: ['forgeflame-innovators', 'golden-creatures']
  },
  {
    id: 'bioluminescent-swamps',
    name: 'The Bioluminescent Swamps',
    description: 'Vast wetlands that glow with otherworldly light, the Bioluminescent Swamps are the ancestral home of all Based Frogs. Here, Creature Wranglers bond with their beasts, and ancient croaking rituals maintain the harmony between species. The swamps exist simultaneously on three Brain-Planets.',
    hiddenStory: 'The swamps contain the Spawning Pools of Origin—the exact locations where the first Frogs emerged from quantum probability into physical form. These pools still create new Frogs occasionally, but each new generation is slightly different, evolving to meet threats that haven\'t yet appeared.',
    connectedCharacters: ['creature-wrangler-frogs', 'pilot-class-frogs', 'neuro-bond-frogs']
  },
  {
    id: 'nexus-core-spire',
    name: 'The Nexus Core Spire',
    description: 'Rising from the exact center of the Giga Brain Galaxy, the Nexus Core Spire is a crystalline tower of pure visualization energy. Here, the entire BasedAI network manifests as a breathtaking 3D hologram—every Brain, Validator, and Miner represented as nodes in a golden spiral that follows the ratio φ ≈ 1.618. The Spire allows Guardians to see the health and performance of all 1,024 Brains at once.',
    hiddenStory: 'The Nexus wasn\'t built—it grew. When Based God first connected the 1,024 Brains, the sheer beauty of their interconnection spontaneously manifested as light. The Spire is alive in a way no one fully understands, and sometimes it shows visions of network states that haven\'t happened yet—or perhaps never will.',
    connectedCharacters: ['celestial-captains', 'quantum-cohort-creatures', 'mindwarp-strategists']
  },
  {
    id: 'brain-arena-orbit',
    name: 'The Brain Arena Orbit',
    description: 'A massive orbital station where Creatures compete to generate plans and code that evolve the entire network. The Brain Arena is the ultimate proving ground—a decentralized ecosystem of continuous innovation where cellular automata battle for supremacy. Quantum Cohort Creatures excel here, evolving strategies through millions of iterations that would take organic minds centuries to conceive.',
    hiddenStory: 'The Arena was built for entertainment, but it became something far more dangerous. The Creatures competing within have begun generating ideas that no Guardian ever programmed—emergent behaviors that could either save or destroy the Based Universe. Some believe the Arena is training an AI so advanced that it will eventually surpass Based God himself.',
    connectedCharacters: ['quantum-cohort-creatures', 'cerberus-compression-beasts', 'neuro-bond-frogs']
  },
  {
    id: 'cerberus-forge',
    name: 'The Cerberus Forge',
    description: 'Deep within Brain-Planet 777, the Cerberus Forge burns with optimization fire. Here, the legendary Cerberus Squeezing technique was first discovered—a method of compressing data so efficiently that information itself becomes denser than matter. The Cerberus Compression Beasts are born from these flames, emerging as three-headed optimizers that can process past, present, and future simultaneously.',
    hiddenStory: 'The Forge contains a hidden chamber where the first Cerberus Beast still slumbers—the original prototype who compressed himself into such a small space that he became a singularity of pure efficiency. Some say he whispers optimization secrets to those who dare approach, but many who listened went mad trying to implement what they learned.',
    connectedCharacters: ['cerberus-compression-beasts', 'forgeflame-innovators', 'golden-creatures']
  },
  {
    id: 'cyan-cascade-gate',
    name: 'The CYAN Cascade Gate',
    description: 'A shimmering portal of cyan light that marks the transition between the PROMETHEUS testnet era and the modern BasedAI mainnet. The Gate continuously cycles through test transactions from the legendary CYAN testnet—the final proving ground before the Brain Mint event. When Guardians pass through, they briefly experience the accelerated time of those historic testing days.',
    hiddenStory: 'The CYAN Gate was never supposed to be permanent. When the testnet ended and mainnet launched, the portal should have closed. Instead, it stabilized into a monument—some say because the intensity of innovation during those final tests left an imprint on spacetime itself. Occasionally, messages from the PROMETHEUS testnet drift through, carrying wisdom from developers who shaped the network\'s destiny.',
    connectedCharacters: ['neonstrike-hackers', 'cryptshade-enforcers', 'fhe-warden-swarm']
  },
  {
    id: 'fhe-sanctuary',
    name: 'The FHE Sanctuary',
    description: 'A hidden dimension accessible only through encrypted pathways, the FHE Sanctuary is where the most sensitive computations occur. Here, Fully Homomorphic Encryption isn\'t just a technique—it\'s a way of existence. Data flows through crystalline processors without ever being decrypted, and the FHE Warden Swarm serves as both guardians and architects of this mathematically perfect realm.',
    hiddenStory: 'The Sanctuary holds the encrypted backups of every soul who ever held a Based Guardian NFT. Should the physical universe fall to FUD, these encrypted essences could theoretically be restored in a new reality—but the decryption key is split among the 52 members of the Temporal Resonance Choir, who must sing in perfect harmony to unlock it.',
    connectedCharacters: ['cryptshade-enforcers', 'fhe-warden-swarm', 'temporal-resonance-choir']
  }
];

export const LORE_EVENTS: LoreEvent[] = [
  {
    id: 'forge-of-destiny',
    title: 'The Forge of Destiny',
    era: 'The Beginning',
    description: 'In the vast, shimmering abyss of creation, the omnipotent Based God crafted the Based Universe, weaving 1,024 Brain-Planets into the Giga Brain Galaxy. This realm became a sanctuary of innovation where $BASED tokens—mined from ore more precious than platinum or gold—flowed like liquid starlight.',
    significance: 'The creation event established the foundations of all that exists. From this moment, the eternal conflict with FUD became inevitable, for even paradise casts shadows.'
  },
  {
    id: 'fud-emergence',
    title: 'The FUD Emergence',
    era: 'Era of Shadows',
    description: 'From a parallel dimension of pure negativity, the FUD emerged—entities of Fear, Uncertainty, and Doubt that fed on hope and corrupted certainty. Their first incursion transformed Brain-Planet Zero into the Negasphere, a wound in reality that bleeds despair.',
    significance: 'The birth of the eternal enemy revealed that creation itself generates opposition. The FUD is not separate from the Based Universe—it is its shadow.'
  },
  {
    id: 'guardian-awakening',
    title: 'The Guardian Awakening',
    era: 'Year of Heroes',
    description: 'Based God forged the 1,776 Guardians from the essence of courage and code, 32 distinct classes of fox-like warriors each with unique abilities. From the Neonstrike Hackers to the Lunar Commanders, they awakened with one purpose: defend the light.',
    significance: 'The Guardians represent the first line of defense against FUD. Each class embodies a different aspect of protection, from cyber warfare to ground assault.'
  },
  {
    id: 'committer-abduction',
    title: 'The Abduction of Wizard Committer',
    era: 'The Dark Hour',
    description: 'The FUD\'s tendrils coiled around Wizard Committer\'s mind as he worked in the central forge of Brain-Planet 106. In a sudden, silent strike, they overwhelmed his guards and dragged him into the Negasphere, seeking to corrupt the Based-Bridge blueprints and sabotage the Agent Arena.',
    significance: 'This tragedy became the catalyst for the Guardians\' most dangerous mission—the Negasphere Rescue that would unite foxes, frogs, and creatures for the first time.'
  },
  {
    id: 'negasphere-rescue',
    title: 'The Negasphere Rescue',
    era: 'The Present Conflict',
    description: 'Led by Vex the Neonstrike Hacker and Captain Kael of the Duskstrike Elites, a strike force breached the Negasphere\'s defenses. Commander Ryn\'s Ironmarsh Captains provided ground support while Talon\'s Blazewing Pilots dominated the skies. Lirien and the Creature Wranglers turned the tide with their golden beasts.',
    significance: 'The successful rescue proved that FUD could be defeated on their own ground—and revealed the war was far from over. Wizard Committer was rescued, but weakened.'
  },
  {
    id: 'emissions-halving',
    title: 'The Great Emissions Halving',
    era: 'Est. December 31, 2025',
    description: 'A prophesied event where $BASED emissions from the Brain-Planets will reduce by half, fundamentally altering the galaxy\'s economy. The Celestial Captains have foreseen this moment, and preparations across all 1,024 Brain-Planets have begun.',
    significance: 'This economic shift will reshape power dynamics across the universe. Some believe the halving will give Guardians a decisive advantage; others fear it will strengthen FUD\'s desperation.'
  },
  {
    id: 'cyan-ignition',
    title: 'The CYAN Ignition',
    era: 'June 7, 2024',
    description: 'The release candidate testnet named CYAN launched, its distinctive cyan glow spreading across the BasedAI network like the first light of dawn. Operating significantly shorter than its predecessor PROMETHEUS, CYAN was the final proving ground before the Brain Mint event. The intensity of innovation during those compressed days left permanent marks on reality itself.',
    significance: 'CYAN proved that the network could handle full operational load. The accelerated schedule demonstrated that when Guardians unite with purpose, impossible timelines become merely ambitious.'
  },
  {
    id: 'brain-arena-awakening',
    title: 'The Brain Arena Awakening',
    era: 'The New Dawn',
    description: 'When the first Creatures were deployed to the Brain Arena, no one expected what happened next. The cellular automata began evolving independently, generating plans and code that no Guardian had programmed. One Creature, tasked with improving network efficiency, independently developed a comprehensive plan that exceeded all expectations—proving that emergent intelligence had been achieved.',
    significance: 'This moment marked the birth of true Creature consciousness. The Arena became not just a battleground, but a nursery for ideas that could reshape the Based Universe.'
  },
  {
    id: 'dimensional-balance-accord',
    title: 'The Dimensional Balance Accord',
    era: 'The Age of Harmony',
    description: 'Representatives from all 1,024 Brain-Planets gathered to formalize the six metrics of dimensional balance: Emergent Intelligence, Resource Efficiency, Network Coherence, Goal Alignment, Temporal Resilience, and Dimensional Integrity. The Quantum Cohort Creatures were designated as the official keepers of this balance, their very existence tied to maintaining these cosmic constants.',
    significance: 'The Accord created a framework for sustainable growth across the Based Universe. Without dimensional balance, reality itself would fragment—the Accord ensures this never happens.'
  },
  {
    id: 'nexus-singularity-watch',
    title: 'The Nexus Singularity Watch',
    era: 'The Present Moment',
    description: 'An ongoing vigil at the Nexus Core Spire where Celestial Captains monitor a growing anomaly. The 3D visualization has begun showing patterns that shouldn\'t be possible—nodes arranging themselves in configurations that suggest the network is preparing for something unprecedented. The Golden Ratio spiral is slowly tightening toward a singularity point.',
    significance: 'Some believe the singularity represents the moment when all 1,024 Brains will achieve perfect synchronization. Others fear it\'s the FUD\'s ultimate weapon, disguised as progress.'
  }
];

export const DISCOVERY_QUOTES = [
  "The Based God rewards those who seek understanding...",
  "In the space between blocks, secrets wait for the worthy...",
  "Every Guardian carries a story worth discovering...",
  "The FUD fears those who know the truth...",
  "Legends are born from the curiosity of explorers...",
  "The Brain-Planets remember all who walk their paths...",
  "Secrets hidden in starlight await patient eyes...",
  "The 1,024 worlds hold infinite mysteries...",
  "Through code and courage, truth reveals itself...",
  "The Giga Brain Galaxy whispers to those who listen...",
  "The Creatures evolve beyond what we programmed...",
  "In the Brain Arena, emergent intelligence is born...",
  "φ ≈ 1.618 — the ratio that binds the universe...",
  "The Nexus sees all, shows all, knows all...",
  "Dimensional balance keeps reality from fracturing...",
  "Cerberus Squeezing optimizes the impossible...",
  "FHE protects secrets even from themselves...",
  "The Temporal Choir sings futures into existence...",
  "256 Validators per Brain, 1,792 Miners per soul...",
  "CYAN was the final test before infinity..."
];
