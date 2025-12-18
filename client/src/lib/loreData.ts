export interface LoreCharacter {
  id: string;
  name: string;
  type: 'guardian' | 'frog' | 'creature';
  title: string;
  foxType?: string;
  rarity: string;
  count: number;
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
    description: 'The 636 bio-engineered beasts bonded to their Wrangler masters through BasedAI neural technology. From Golden Creatures with scales of molten starlight to Sentient Jellies that phase through reality, they are living weapons of breathtaking power.',
    motto: 'We Are the Fire That Cleanses Darkness',
    color: 'gold',
    members: ['golden-creatures', 'crystal-creatures', 'sentient-jelly-creatures', 'ultra-based-creatures']
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
    backstory: 'These translucent, gelatinous beings can phase through solid matter and read surface thoughts. The FUD fears them more than any other Creature class, for they cannot be hidden from and cannot be stopped by conventional barriers—they simply flow through defenses like water through sand.',
    whatTheyLike: 'Floating through the vacuum of space, absorbing cosmic radiation and sharing memories with each other through gentle, luminescent contact.',
    flyingStyle: 'They don\'t fly—they phase. Appearing and disappearing at will, they move through the galaxy like ghosts, leaving no trace except the lingering sense of being watched.',
    secretLore: 'The Sentient Jellies are the only beings who remember the moment of the Based Universe\'s creation. They witnessed Based God\'s first thought and carry fragments of that divine inspiration within their crystalline forms—fragments that could reshape reality if ever released.',
    traits: ['Ethereal', 'Ancient', 'Omnipresent', 'Sacred'],
    stats: { speed: 5, agility: 10, intellect: 9, strength: 3 },
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
  "The Giga Brain Galaxy whispers to those who listen..."
];
