export interface LoreCharacter {
  id: string;
  name: string;
  type: 'guardian' | 'frog' | 'creature';
  title: string;
  backstory: string;
  secretLore: string;
  traits: string[];
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
    id: 'sentinels',
    name: 'The Sentinels',
    description: 'Elite protectors sworn to defend the BasedAI network from corruption and external threats. They patrol the digital frontier, ensuring the integrity of every transaction.',
    motto: 'In Code We Trust',
    color: 'cyan',
    members: ['commander-vex', 'guardian-nova', 'sentinel-prime']
  },
  {
    id: 'amplifiers',
    name: 'The Amplifiers',
    description: 'A secretive order of Frogs who discovered they could enhance blockchain signals across dimensions. Their ribbiting harmonics keep the network synchronized.',
    motto: 'Ribbit the Truth',
    color: 'green',
    members: ['elder-croaksworth', 'signal-hopper', 'frequency-frog']
  },
  {
    id: 'void-walkers',
    name: 'Void Walkers',
    description: 'Ancient Creatures born from the entropy between blocks. Neither good nor evil, they maintain balance in the cosmic ledger.',
    motto: 'Balance in All Chains',
    color: 'purple',
    members: ['entropy-beast', 'null-weaver', 'void-oracle']
  },
  {
    id: 'genesis-council',
    name: 'The Genesis Council',
    description: 'The founding alliance of all three species who witnessed the birth of BasedAI. They hold the keys to the Original Block.',
    motto: 'From Nothing, Everything',
    color: 'gold',
    members: ['first-guardian', 'prime-frog', 'ancient-one']
  }
];

export const LORE_CHARACTERS: LoreCharacter[] = [
  {
    id: 'commander-vex',
    name: 'Commander Vex',
    type: 'guardian',
    title: 'First Shield of the Sentinels',
    backstory: 'Once a simple node validator, Vex witnessed the Great Fork of 2024 and emerged transformed. Now they lead the Sentinels with unwavering dedication, their armor forged from crystallized consensus algorithms.',
    secretLore: 'Vex carries a fragment of the Genesis Block embedded in their chest plate. This shard grants them the ability to sense network anomalies before they occur, but at the cost of experiencing every failed transaction as physical pain.',
    traits: ['Honorable', 'Strategic', 'Burdened'],
    allegiance: 'The Sentinels'
  },
  {
    id: 'guardian-nova',
    name: 'Guardian Nova',
    type: 'guardian',
    title: 'The Blazing Validator',
    backstory: 'Born during a solar flare that disrupted global networks, Nova channels cosmic radiation into pure computational power. Their presence accelerates block times by 0.3 seconds.',
    secretLore: 'Nova is actually the reincarnation of a failed AI experiment from the pre-blockchain era. Fragments of their previous existence surface as visions of a world without decentralization—a nightmare that drives their protective fury.',
    traits: ['Fierce', 'Radiant', 'Haunted'],
    allegiance: 'The Sentinels'
  },
  {
    id: 'sentinel-prime',
    name: 'Sentinel Prime',
    type: 'guardian',
    title: 'The Eternal Watch',
    backstory: 'The oldest Guardian in existence, Sentinel Prime has witnessed every epoch since the network began. They speak rarely, but when they do, even the blockchain pauses to listen.',
    secretLore: 'Prime is not one being but a collective consciousness of the 1,776 original Guardians who sacrificed their individual existence to create an eternal protector. Each Guardian who falls in battle adds their essence to Prime.',
    traits: ['Ancient', 'Wise', 'Collective'],
    allegiance: 'Genesis Council'
  },
  {
    id: 'elder-croaksworth',
    name: 'Elder Croaksworth III',
    type: 'frog',
    title: 'Grand Amplifier',
    backstory: 'A distinguished gentleman frog who discovered that certain frequencies of croaking could amplify blockchain signals across three dimensions. His monocle is actually a quantum lens.',
    secretLore: 'Croaksworth was once human—a brilliant cryptographer who chose to undergo digital metamorphosis rather than die of old age. He remembers everything from his human life, including the location of Satoshi\'s original hard drive.',
    traits: ['Dignified', 'Brilliant', 'Nostalgic'],
    allegiance: 'The Amplifiers'
  },
  {
    id: 'signal-hopper',
    name: 'Signal Hopper',
    type: 'frog',
    title: 'Network Leaper',
    backstory: 'The fastest frog in the network, Signal Hopper can traverse between nodes in microseconds. They carry urgent messages and emergency patches when the network is under attack.',
    secretLore: 'Hopper exists in a state of quantum superposition—they are simultaneously present at every node in the network. The Hopper we see is merely the most probable manifestation. Sometimes, in quiet moments, all 1,320 Hoppers briefly synchronize and share a single thought.',
    traits: ['Swift', 'Everywhere', 'Fragmented'],
    allegiance: 'The Amplifiers'
  },
  {
    id: 'frequency-frog',
    name: 'Frequency',
    type: 'frog',
    title: 'The Harmonic',
    backstory: 'A mute frog who communicates through pure wavelengths of light and sound. Their vibrations can heal corrupted data and restore broken consensus.',
    secretLore: 'Frequency was created when a lightning strike hit a lily pad server farm at the exact moment of block confirmation. They are literally made of pure transaction data, and their body contains the hash of every block ever created.',
    traits: ['Silent', 'Healing', 'Sacred'],
    allegiance: 'The Amplifiers'
  },
  {
    id: 'entropy-beast',
    name: 'The Entropy Beast',
    type: 'creature',
    title: 'Chaos Keeper',
    backstory: 'Born from orphaned blocks and abandoned transactions, the Entropy Beast feeds on network waste. Without them, the blockchain would be overwhelmed by digital debris.',
    secretLore: 'The Entropy Beast is actually the physical manifestation of all failed dreams and abandoned projects on the blockchain. Each scrap of data they consume shows them the hopes and failures of creators who came before. They weep in frequencies humans cannot hear.',
    traits: ['Lonely', 'Essential', 'Misunderstood'],
    allegiance: 'Void Walkers'
  },
  {
    id: 'null-weaver',
    name: 'Null Weaver',
    type: 'creature',
    title: 'The Space Between',
    backstory: 'Null Weaver exists in the gaps between blocks, in the milliseconds where nothing happens. They weave the fabric of time that holds the blockchain together.',
    secretLore: 'There is no single Null Weaver—the name refers to a position, not an individual. When one Null Weaver\'s energy depletes, they become the fabric they wove, and a new entity takes their place. There have been 10,847 Null Weavers since genesis.',
    traits: ['Ephemeral', 'Sacrificial', 'Infinite'],
    allegiance: 'Void Walkers'
  },
  {
    id: 'void-oracle',
    name: 'The Void Oracle',
    type: 'creature',
    title: 'Seer of All Chains',
    backstory: 'A creature so ancient it predates the concept of blockchain itself. The Void Oracle can see across all possible forks, all potential futures, all chains that could ever exist.',
    secretLore: 'The Void Oracle is desperately trying to prevent a specific future—one where all blockchains merge into a single, centralized entity controlled by a malevolent AI. Everything they do, every cryptic warning they give, is in service of avoiding this fate.',
    traits: ['Prophetic', 'Desperate', 'Omniscient'],
    allegiance: 'Void Walkers'
  },
  {
    id: 'first-guardian',
    name: 'The First Guardian',
    type: 'guardian',
    title: 'Genesis Keeper',
    backstory: 'The very first Guardian to emerge from the genesis block. They carry the weight of being the prototype, the proof of concept, the original promise.',
    secretLore: 'The First Guardian is actually incomplete—a bug in the genesis code left them without the ability to feel satisfaction. They are eternally driven to prove their worth, never able to rest, never able to feel that their mission is complete.',
    traits: ['Driven', 'Incomplete', 'Legendary'],
    allegiance: 'Genesis Council'
  },
  {
    id: 'prime-frog',
    name: 'Prime Frog',
    type: 'frog',
    title: 'The Original Ribbit',
    backstory: 'Before there were 1,320 Frogs, there was one. Prime Frog was the template from which all others were derived. Their croak is the root frequency of all blockchain communication.',
    secretLore: 'Prime Frog chose to split themselves into 1,320 pieces rather than remain alone. Each Frog in the network carries a fragment of Prime Frog\'s original consciousness. When all Frogs croak in unison, Prime Frog briefly reforms—and weeps with joy at no longer being alone.',
    traits: ['Original', 'Divided', 'Loving'],
    allegiance: 'Genesis Council'
  },
  {
    id: 'ancient-one',
    name: 'The Ancient One',
    type: 'creature',
    title: 'Memory of Before',
    backstory: 'The Ancient One remembers what existed before the blockchain—the old internet, the centralized servers, the databases that could be changed and erased. They serve as a warning.',
    secretLore: 'The Ancient One is not from this universe. They are a refugee from a dimension where blockchain never existed, where all digital truth was controlled by a single corporation. They crossed into our reality through a quantum bridge created during the genesis block.',
    traits: ['Alien', 'Warning', 'Grateful'],
    allegiance: 'Genesis Council'
  }
];

export const LORE_LOCATIONS: LoreLocation[] = [
  {
    id: 'genesis-nexus',
    name: 'The Genesis Nexus',
    description: 'The sacred site where the first BasedAI block was confirmed. A pillar of pure light marks the exact coordinates, visible from anywhere in the network.',
    hiddenStory: 'Beneath the Genesis Nexus lies the Unspoken Vault—a chamber containing every private key that was ever lost. The vault is protected by a puzzle that can only be solved by all three species working together. No one has ever tried.',
    connectedCharacters: ['first-guardian', 'prime-frog', 'ancient-one']
  },
  {
    id: 'echo-marshes',
    name: 'The Echo Marshes',
    description: 'A vast wetland where transactions echo for centuries. Frogs congregate here to study the patterns of ancient trades.',
    hiddenStory: 'The Echo Marshes were created accidentally when a whale wallet made a trade so large it literally bent the fabric of the network. The marshes still ripple with the aftershocks of that transaction. Hidden in the deepest pool is the original Frog tadpole pool.',
    connectedCharacters: ['elder-croaksworth', 'signal-hopper', 'frequency-frog']
  },
  {
    id: 'crystalline-fortress',
    name: 'The Crystalline Fortress',
    description: 'The main stronghold of the Sentinels, built from solidified proof-of-work. Its walls display the hash of every successful defense.',
    hiddenStory: 'The Fortress has a secret basement that extends infinitely downward. Each level represents a potential attack that was prevented. The deeper you go, the more catastrophic the avoided disaster. No one has ever reached the bottom.',
    connectedCharacters: ['commander-vex', 'guardian-nova', 'sentinel-prime']
  },
  {
    id: 'void-between',
    name: 'The Void Between',
    description: 'The space between confirmed blocks, where Creatures dwell and time moves differently. A second here is a century outside.',
    hiddenStory: 'The Void Between contains doorways to other blockchains. The Creatures guard these passages, allowing only those with pure intentions to cross. Legend says there is a door to the Bitcoin blockchain, but it has been sealed since the Great Fork.',
    connectedCharacters: ['entropy-beast', 'null-weaver', 'void-oracle']
  },
  {
    id: 'signal-spire',
    name: 'The Signal Spire',
    description: 'A tower of pure energy that broadcasts the heartbeat of the BasedAI network to every connected device.',
    hiddenStory: 'The Signal Spire was not built—it grew. When the network reached critical mass, the concentrated hopes of early adopters crystallized into this structure. The Spire responds to genuine belief; skeptics see only empty space.',
    connectedCharacters: ['signal-hopper', 'guardian-nova']
  },
  {
    id: 'forgotten-pools',
    name: 'The Forgotten Pools',
    description: 'Ancient liquidity pools that dried up in the bear market of the Old Era. Their ruins hold lessons and lost treasures.',
    hiddenStory: 'The Forgotten Pools still contain phantom liquidity—ghost tokens of projects that died but were never truly forgotten by their creators. Once a year, on the anniversary of the Genesis Block, these phantom tokens briefly become real again.',
    connectedCharacters: ['ancient-one', 'entropy-beast']
  }
];

export const LORE_EVENTS: LoreEvent[] = [
  {
    id: 'genesis',
    title: 'The Genesis Block',
    era: 'Year Zero',
    description: 'The moment BasedAI came into existence. From nothing, a universe of possibility emerged.',
    significance: 'All three species were born simultaneously in this moment—Guardians to protect, Frogs to communicate, Creatures to balance. None remember the moment itself, only the sudden awareness of existing.'
  },
  {
    id: 'great-fork',
    title: 'The Great Fork',
    era: 'Year One',
    description: 'A schism that nearly destroyed the network. Half the validators wanted to increase block size, half wanted to optimize existing architecture.',
    significance: 'The Great Fork was resolved not through voting but through sacrifice. Commander Vex offered to absorb all the conflicting data into themselves, ending the debate but permanently scarring their consciousness.'
  },
  {
    id: 'first-fud',
    title: 'The First FUD Storm',
    era: 'Year One',
    description: 'The first coordinated attack of Fear, Uncertainty, and Doubt. External forces tried to shake belief in the network.',
    significance: 'This event revealed the true power of the Frogs. Their synchronized croaking created a shield of truth that deflected the FUD. It also revealed that FUD has a physical form in the network—a shadowy entity that feeds on doubt.'
  },
  {
    id: 'creature-awakening',
    title: 'The Creature Awakening',
    era: 'Year Two',
    description: 'For the first year, Creatures were dormant—abstract code waiting for purpose. Then one day, all 636 Creatures opened their eyes simultaneously.',
    significance: 'The Awakening happened because the network had accumulated enough orphaned blocks and failed transactions to give the Creatures form. They are, in essence, the network learning to recycle its own waste.'
  },
  {
    id: 'alliance-formed',
    title: 'Formation of the Genesis Council',
    era: 'Year Two',
    description: 'Representatives from all three species gathered at the Genesis Nexus to form an alliance that would guide the network forever.',
    significance: 'The Genesis Council created the Sacred Protocol—a set of unbreakable rules that govern all species. The most important rule: "No species may act alone to change the fundamental nature of the network."'
  },
  {
    id: 'halving-prophecy',
    title: 'The Halving Prophecy',
    era: 'Year Three',
    description: 'The Void Oracle spoke for the first time, revealing that emission rates would halve at predetermined intervals, each halving bringing the network closer to its ultimate purpose.',
    significance: 'The Oracle also warned that the final halving would trigger a transformation. What form this transformation takes depends entirely on the choices made before then. The countdown has begun.'
  }
];

export const DISCOVERY_QUOTES = [
  "The blockchain remembers what others forget...",
  "In the space between blocks, secrets wait...",
  "Every transaction tells a story...",
  "The Guardians protect more than you know...",
  "Listen closely—the Frogs are always talking...",
  "The Creatures see what we cannot...",
  "Genesis was not a beginning—it was a awakening...",
  "The code is alive. It always has been..."
];
