# Based Guardians Command App - Project Scope Document

**Document Version:** 1.0  
**Generated:** December 17, 2024  
**Purpose:** Authoritative system description for AI audit/development consumption

---

## 1. System Overview

### What the Application Does

Based Guardians is a decentralized application (DApp) built for the BasedAI Layer 1 blockchain (Chain ID: 32323). The application serves as the primary interface for the Based Guardians NFT collection—a set of 3,732 unique NFTs comprising three character types: Guardians (1,776), Frogs (1,320), and Creatures (636).

### Primary Goals and Responsibilities

1. **NFT Minting**: Enable users to mint NFTs at a fixed price of 69,420 $BASED per NFT
2. **Marketplace Operations**: Facilitate peer-to-peer NFT trading through both on-chain (V2) and hybrid off-chain/on-chain (V3) marketplace systems
3. **Governance**: Provide an advisory DAO voting system where NFT holders can vote on community proposals
4. **Treasury Tracking**: Display real-time community treasury metrics including mint revenue, royalty revenue, and emissions
5. **Gamification**: Offer an arcade-style game ("Retro Command") with score tracking and leaderboards
6. **User Engagement**: Maintain user profiles, track NFT holding behavior ("Diamond Hands"), and support multi-language interfaces

### Who the Users Are

1. **NFT Holders**: Primary users who own Based Guardians NFTs; have voting rights and game perks
2. **Prospective Buyers**: Users browsing the marketplace or minting interface
3. **Game Players**: All users (no NFT required for basic game access; NFT holders receive gameplay bonuses)
4. **Administrators**: Designated wallet addresses with proposal creation and management privileges

---

## 2. Core Functional Domains

### Voting Systems

**On-Chain Governance (Legacy)**
- Contract Address: `0x2B107A4Ea8fFC4FAa6d55a5bEeb5E2740C849995`
- Functions: createProposal, vote (For/Against), finalizeProposal, cancelProposal
- Voting Power: 1 NFT = 1 Vote (read from `getVotingPower` contract function)
- Proposal Requirements: Minimum NFT threshold to create proposals (`minNFTsToPropose`)
- Quorum: Configurable percentage (`quorumPercentage`)

**Off-Chain Governance (Current Active System)**
- Storage: PostgreSQL database (`proposals`, `proposal_votes` tables)
- Multi-choice voting: Options A/B/C/D per proposal
- Voting power: NFT count submitted with vote
- Workflow: Proposals created in "review" status → Admin approves to "active" → Users vote → Admin closes to "closed"
- Admin-only: Proposal creation, status changes, deletion

### Gameplay Mechanics

**Retro Command Game**
- Genre: Galaga-style arcade shooter with lunar lander bonus stages
- Access: Open to all users (4 plays/day limit, 30-second cooldown for non-holders)
- NFT Holder Perks: +1 life, 1.5x score multiplier, visual ship distinction (green)
- Levels: 5 standard levels; lunar lander physics stage appears every 4th wave (wave 4, 8, 12...)
- Wave Spawning: New wave spawns when active aliens count reaches zero
- Entities: Player, bullets (normal/double/spread), aliens (grunt/bee/butterfly/boss/galaga), power-ups (double/shield/speed/bomb), explosions
- Difficulty: Progressive scaling based on wave number

### Rewards / Play-to-Earn Logic

**Treasury Revenue Sources (LOCKED formulas)**
- Mint Revenue: `minted × 69,420 × 51%` (51% to community treasury)
- Royalty Revenue: `salesVolume × 2%` (2% of 10% total royalty)
- Passive Emissions: 10% of Brain wallet emissions (`communityShare`)

**Emissions Configuration**
- Brain Wallet: `0xB0974F12C7BA2f1dC31f2C2545B71Ef1998815a4`
- Community Share: 10% of brain emissions
- Daily Rate: 6,438 $BASED (community portion)
- Annual Rate: 2,350,000 $BASED (community portion)

**Revenue Splits**
- Mint: 51% Treasury, 49% Creator
- Royalty (10% total): 2% Treasury, 4% Royalty Wallet, 4% Creator

### Leaderboards and Rankings

**Diamond Hands System**
- Tracks NFT holding duration and retention rate via Transfer events
- 6 Levels: Ice → Diamond (based on holding behavior)
- Metrics: daysHolding, retentionRate, currentHolding, totalAcquired, totalSold

**Game Leaderboard**
- Stored in `game_scores` PostgreSQL table
- Metrics: score, level, lifetimeScore, gamesPlayed, highScore
- 6 Rank Tiers: Cadet → Based Eternal
- Persistence: localStorage for offline, database sync for connected users

---

## 3. Architecture & Components

### Frontend

**Framework Stack**
- React 18 with TypeScript
- Vite bundler with HMR
- Tailwind CSS v4 with shadcn/ui components (New York style)
- Framer Motion for animations

**State Management**
- TanStack Query (React Query) for server state
- React Context for application state
- localStorage for game scores and offline data

**Routing**
- Wouter for client-side routing
- Default landing: Command Center (Home.tsx at route "/")

**Key Frontend Directories**
```
client/src/
├── core/           # PROTECTED: Commerce, auth, contracts
├── game/           # ISOLATED: Game engine and renderer
├── features/       # MODULAR: Feature-specific code
├── components/     # UI components including shadcn/ui
├── hooks/          # Custom React hooks
├── lib/            # Utilities, constants, calculations
├── pages/          # Route pages
└── locales/        # i18n translations (10 languages)
```

### Backend/Services

**Server Framework**
- Express.js with TypeScript
- HTTP server with static file serving
- Build: esbuild for server, Vite for client

**API Endpoints**
- `/api/health` - Health check
- `/api/feedback` - User feedback submission
- `/api/stories` - Story submissions
- `/api/push/*` - Push notification subscriptions
- `/api/profile/*` - Guardian profile management
- `/api/proposals/*` - Off-chain governance
- `/api/game/*` - Game score submission and leaderboards
- `/api/diamond-hands/*` - Holding stats

### Blockchain Layer

**Network Configuration**
- Chain: BasedAI Mainnet (Chain ID: 32323)
- RPC: `https://mainnet.basedaibridge.com/rpc/`
- Block Explorer: `https://explorer.bf1337.org`

**Contracts**
| Contract | Address |
|----------|---------|
| NFT | `0xaE51dc5fD1499A129f8654963560f9340773ad59` |
| Marketplace V2 | `0x2836f07Ed31a6DEc09E0d62Fb15D7c6c6Ddb139c` |
| Marketplace V3 | `0x2a3f9D8b844c2dB2F42095B49817c0D6991514f3` |
| Governance | `0x2B107A4Ea8fFC4FAa6d55a5bEeb5E2740C849995` |
| Mint Splitter | `0x371c67FE6e839F921279FcdD7dCb1Fd74eeD1d76` |
| Royalty Splitter | `0xc87C7A5BA2A58bb7BB16799804582BA6C2E43279` |

**Wallet Integration**
- RainbowKit + Wagmi for wallet connectivity
- ethers.js v6 for contract interactions
- Supported wallets: MetaMask, Coinbase, Uniswap, Rainbow, Trust, WalletConnect, Rabby, Phantom, Zerion, OKX, Brave, Ledger, Safe, Argent

### Data Persistence and Caching

**PostgreSQL Database (Drizzle ORM)**
Tables:
- `users` - Basic user accounts
- `feedback` - User feedback submissions
- `story_submissions` - Community story entries
- `push_subscriptions` - Web push notification data
- `email_list` - Email collection
- `guardian_profiles` - Custom names, login tracking
- `diamond_hands_stats` - Holding behavior metrics
- `proposals` - Off-chain governance proposals
- `proposal_votes` - Proposal vote records
- `game_scores` - Game statistics and leaderboard

**Client-Side Caching**
- localStorage for game scores, offers (V3), and user preferences
- Memory cache for RPC responses (30-second duration)
- IPFS metadata caching

---

## 4. On-Chain vs Off-Chain Responsibilities

### On-Chain Enforcement

1. **NFT Ownership**: Token ownership verified via `ownerOf`, `balanceOf`, `tokensOfOwner` contract calls
2. **Minting**: Payment and token issuance executed on-chain (`mint` function with payable value)
3. **Marketplace V2**: Listing, delisting, buying, on-chain offers all executed via contract
4. **Marketplace V3 Purchase Completion**: Final purchase transaction executed on-chain
5. **Revenue Distribution**: Splitter contracts handle mint/royalty distribution automatically
6. **Legacy Governance Voting**: On-chain proposal creation and vote recording

### Off-Chain Handling

1. **V3 Offer Creation**: Gasless EIP-712 signed messages stored in localStorage
2. **V3 Offer Acceptance**: Signature-based authorization (on-chain purchase follows)
3. **Current Governance**: All proposal management via PostgreSQL database
4. **User Profiles**: Custom names, login tracking in database
5. **Game Scores**: Stored in database with localStorage backup
6. **Diamond Hands Stats**: Calculated from Transfer events, stored in database
7. **Push Notifications**: Subscription management in database

### Source of Truth for Critical State

| Data Type | Source of Truth |
|-----------|-----------------|
| NFT Ownership | On-chain (`ownerOf`) |
| NFT Balances | On-chain (`balanceOf`, `tokensOfOwner`) |
| Active Listings (V2) | On-chain (`getActiveListings`) |
| Pending Offers (V3) | localStorage (client-side) |
| Mint Count | On-chain (`totalMinted`) |
| Treasury Calculations | Derived from on-chain data + locked formulas |
| Voting Power | On-chain (`getVotingPower` or `balanceOf`) |
| Proposal Votes (current) | PostgreSQL database |
| Game Scores | PostgreSQL database (with localStorage fallback) |

---

## 5. Data & State Flow

### How Data Enters the System

1. **Blockchain Events**: Transfer, Listed, Sold events read via `eth_getLogs`
2. **Contract State Reads**: `useReadContract` hooks with polling intervals (10-30 seconds)
3. **User Input**: Forms for feedback, profiles, proposals, game scores
4. **External APIs**: CoinGecko for $BASED price, IPFS/Pinata for NFT metadata
5. **Wallet Connection**: RainbowKit provides connected address and chain

### How State is Updated and Consumed

**Frontend State Flow**
```
Contract/API → TanStack Query → Component State → UI Render
         ↓
   localStorage (game/offers)
```

**Backend State Flow**
```
API Request → Zod Validation → Storage Interface → Drizzle ORM → PostgreSQL
```

**Minting Flow**
1. User initiates mint → useMint hook validates (balance, pause status, supply)
2. writeContract sends transaction with value
3. Wait for confirmation → refetch contract data
4. UI updates with new ownership

**Marketplace V2 Flow**
1. Approval check → listNFT/delistNFT/buyNFT via writeContract
2. Transaction confirmation → refetch listings
3. Activity feed updates via event logs

**Marketplace V3 Flow**
1. Buyer signs EIP-712 offer → stored in localStorage
2. Seller accepts → signature stored
3. Buyer calls completePurchase → on-chain transfer
4. localStorage entry removed

### How Leaderboard/Aggregate Data is Derived

**Treasury Aggregation**
- mintRevenue: `totalMinted (on-chain) × 69,420 × 0.51`
- royaltyRevenue: `salesVolume (from Sold events + baseline) × 0.02`
- emissions: Read from Brain wallet transfers

**Game Leaderboard**
- Sorted by `highScore` descending
- Rank tier calculated from `lifetimeScore` thresholds

**Activity Feed**
- Queries Transfer, Listed, Sold events within block range (currently 2,000 blocks)
- Aggregates totalMints, totalListings, totalSales, totalVolume

---

## 6. Trust, Security, and Authority Boundaries

### Components That Must Be Trusted

1. **BasedAI RPC Endpoint**: Primary data source for all blockchain reads
2. **Smart Contracts**: NFT, Marketplace V2/V3, Governance contracts
3. **PostgreSQL Database**: Stores off-chain governance votes, profiles, scores
4. **Admin Wallets**: Control proposal lifecycle
5. **Splitter Contracts**: Automatic revenue distribution

### Components That Are Intentionally Untrusted

1. **Client-Side localStorage**: V3 offers can be manipulated; on-chain verification required
2. **User Input**: All API inputs validated with Zod schemas
3. **External Content**: DOMPurify sanitization for user messages
4. **Price Feeds**: CoinGecko data used for display only, not transactions

### Authentication/Authorization Boundaries

**Wallet-Based Authentication**
- No traditional login; wallet address is identity
- `useAccount` hook provides connected address
- Ownership verified via `balanceOf` and `tokensOfOwner`

**Admin Authorization**
- Hardcoded admin wallet list in `constants.ts` and `routes.ts`
- Admin functions gated by `isAdminWallet()` check
- Admin Wallets:
  - `0xae543104fdbe456478e19894f7f0e01f0971c9b4`
  - `0xb1362caf09189887599ed40f056712b1a138210c`
  - `0xabce9e63a9ae51e215bb10c9648f4c0f400c5847`
  - `0xbba49256a93a06fcf3b0681fead2b4e3042b9124`
  - `0xc5ca5cb0acf8f7d4c6cd307d0d875ee2e09fb1af`

**NFT Gating**
- Offer messaging requires 1+ NFT (`useIsGuardianHolder`)
- Game perks require NFT ownership
- Voting power derived from NFT balance

---

## 7. Performance Characteristics

### High-Frequency Execution Paths

1. **Contract State Polling**: `totalMinted`, `balanceOf` every 10-15 seconds
2. **Listing Data Refresh**: `getActiveListings` every 15 seconds
3. **Game Loop**: 60fps render loop with entity updates
4. **Price Ticker**: 8-second rotation between $BASED and BTC/ETH prices

### Gas-Sensitive Operations

| Operation | Gas Limit | Gas Price |
|-----------|-----------|-----------|
| Mint | 8,000,000 | 10 gwei |
| List NFT | 300,000 | 10 gwei |
| Buy NFT | 400,000 | 10 gwei |
| Approve | 200,000 | 10 gwei |
| Make Offer | 300,000 | 10 gwei |
| Delist | 150,000 | 10 gwei |

### Areas Sensitive to Scale

1. **Activity Feed Event Queries**: Currently limited to 2,000 blocks due to RPC timeout constraints
2. **NFT Gallery Loading**: Fetches metadata for all 3,732 NFTs; relies on CSV preload + on-chain minted data
3. **Game Leaderboard**: Limited to 50 entries per query
4. **localStorage Limits**: V3 offers stored client-side; cleanup runs to prevent overflow

---

## 8. Critical Invariants (Must Never Break)

### Voting Integrity Assumptions

1. Voting power MUST equal NFT balance at time of vote
2. One wallet = one vote per proposal (database unique constraint)
3. Only admin wallets can create/approve/close proposals
4. Votes cannot be changed after submission

### Reward Calculation Assumptions

**LOCKED Formulas (marked in source code)**
- `mintRevenue = minted × 69,420 × 51%`
- `royaltyRevenue = salesVolume × 2%`
- `backedValue = totalTreasury ÷ mintedNFTs`
- `totalVolume = sum of on-chain Sold event prices` (never hardcoded except historical baseline)
- `communityShare = brainEmissions × 10%`

**Revenue Split Constants**
- Mint: 51% treasury / 49% creator
- Royalty: 2% treasury / 4% royalty wallet / 4% creator

### Gameplay Rules

1. Non-holders: 4 plays/day, 30-second cooldown
2. NFT holders: +1 life, 1.5x score multiplier
3. Wave progression: New wave when active aliens = 0
4. Lunar lander: Appears every 4th wave (4, 8, 12...)
5. High score persists in localStorage under key `galaga_high`

---

## 9. External Dependencies & Integrations

### Blockchains

| Network | Purpose | RPC Endpoint |
|---------|---------|--------------|
| BasedAI Mainnet | Primary chain | `https://mainnet.basedaibridge.com/rpc/` |
| Ethereum Mainnet | ETH price feeds (fallback) | Multiple free endpoints (Llamarpc, Ankr, etc.) |

### Wallets

Integrated via RainbowKit:
- MetaMask, Coinbase Wallet, Uniswap Wallet, Rainbow, Trust Wallet
- WalletConnect, Rabby, Phantom, Zerion, OKX Wallet, Brave Wallet
- Ledger, Safe, Argent

### APIs

| Service | Purpose | Authentication |
|---------|---------|----------------|
| CoinGecko | $BASED price feed | None (free tier) |
| Binance | BTC/ETH prices | None (public API) |
| IPFS (Pinata) | NFT metadata/images | Gateway URL |

**IPFS Configuration**
- Gateway: `https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/`
- Metadata CID: `bafybeie3c5ahzsiiparmbr6lgdbpiukorbphvclx73dwr6vrjfalfyu52y`

### Oracles or Third-Party Services

- No oracle integration present
- Price data is display-only (not used for on-chain logic)

---

## 10. Known Constraints & Intentional Tradeoffs

### Simplifications Visible in Code

1. **V3 Offers in localStorage**: Offers are stored client-side rather than in database; offers can be lost if browser storage is cleared
2. **Activity Feed Block Range**: Limited to 2,000 blocks (~1 hour) due to RPC timeout constraints; historical data uses CUMULATIVE_SALES_BASELINE constant
3. **Game Score Trust**: Scores submitted from client are accepted without verification; anti-cheat measures are limited to rate limiting
4. **Single RPC Endpoint**: Primary reliance on single BasedAI RPC; fallback endpoints exist but are not actively rotated

### Areas Optimized for Speed vs Safety

1. **Polling Intervals**: Contract reads poll every 10-30 seconds to reduce RPC load at cost of real-time accuracy
2. **Caching**: 30-second cache duration for RPC responses; stale data possible
3. **Lazy Loading**: AdminDashboard and BrainDiagnostics components are lazy-loaded
4. **React.memo**: Applied to MarketCard, NFTImage, RarityChart for render optimization

### Historical Data Handling

- CUMULATIVE_SALES_BASELINE: 2,500,000 $BASED historical volume set as constant
- Represents sales volume that occurred before activity feed window
- Required because RPC cannot query full historical event logs

---

## 11. Explicitly Out of Scope

### Features Not Implemented

1. **Real-Time Notifications**: Web push infrastructure exists but is not fully operational
2. **Mobile Native App**: Web-only; no iOS/Android native applications
3. **Fiat Payments**: All transactions in $BASED native token only
4. **NFT Breeding/Staking**: Not present in current implementation
5. **Secondary Token Rewards**: No play-to-earn token distribution
6. **Cross-Chain Bridging**: BasedAI-only; no bridge functionality
7. **On-Chain Proposal Execution**: Current governance is advisory (off-chain) only

### Non-Goals Inferred from Codebase

1. **Decentralized Proposal Storage**: Proposals stored in centralized PostgreSQL, not IPFS/blockchain
2. **Trustless Game Verification**: Game scores are not cryptographically verified
3. **Automated Treasury Distribution**: Manual admin action required for treasury operations beyond splitter contracts
4. **NFT Metadata Mutability**: Metadata is static on IPFS; no on-chain metadata updates
5. **Price-Based Trading Logic**: Marketplace does not enforce floor prices or royalty minimums beyond contract settings

---

## Appendix A: Protected/Locked Files

The following files are marked as LOCKED and require explicit authorization to modify:

```
client/src/components/PoolTracker.tsx
client/src/components/ValueEstimation.tsx
client/src/components/ActivityFeed.tsx
client/src/hooks/useActivityFeed.ts
client/src/hooks/useSubnetEmissions.ts
client/src/lib/mockData.ts
client/src/lib/constants.ts
```

## Appendix B: Environment Variables

**Required**
- `DATABASE_URL` - PostgreSQL connection string

**Optional**
- `VITE_GA_ID` - Google Analytics tracking ID
- `VAPID_PUBLIC_KEY` - Web push notification key
- `VITE_ALCHEMY_KEY` - Alchemy API key (if used)

---

*End of Document*
