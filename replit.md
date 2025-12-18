# Based Guardians Command App

## Overview
Based Guardians is a cyberpunk-themed NFT DApp for the BasedAI blockchain (Chain ID 32323). It allows users to mint, view, trade NFTs, and participate in advisory governance for the 3,732 unique Based Guardians NFT collection. The application includes a live gallery, an OpenSea-style marketplace, a DAO voting system, community pool tracking, real-time token price feeds, and user gamification with levels and badges. It also supports custom Guardian names, multi-language UI, and a Retro Defender game. The project aims to be a comprehensive platform for the Based Guardians community, integrating financial tools with engaging user experiences.

## User Preferences
Preferred communication style: Simple, everyday language.

**Default Landing Page**: Command Center (Home.tsx at route "/") - ALWAYS use this as the default landing page. If any issues occur with routing or the app, ensure users land on the Command Center page.

### LOCKED SYSTEMS - FINANCIAL GRADE (Do NOT modify without explicit user request)

⚠️ **CRITICAL**: This app functions as a financial tool. All calculation, data gathering, and reporting systems are LOCKED. Do not modify any of these without explicit user request.

#### Locked Components:
- **PoolTracker.tsx**: Treasury calculations (mint revenue, royalty revenue, emissions)
- **ValueEstimation.tsx**: Backed value per NFT, community treasury display
- **useActivityFeed.ts**: Total volume calculation, block range, event fetching logic
- **ActivityFeed.tsx**: Stats display, activity parsing, filter logic
- **useSubnetEmissions.ts**: Brain emissions data, community share calculations
- **mockData.ts**: calculateBackedValue(), calculatePassiveEmissions(), RARITY_CONFIG
- **constants.ts**: MINT_SPLIT, ROYALTY_SPLIT, CUMULATIVE_SALES_BASELINE, contract addresses

#### Locked Formulas:
- `mintRevenue = minted × 69,420 × 51%`
- `royaltyRevenue = salesVolume × 2%`
- `backedValue = totalTreasury ÷ mintedNFTs`
- `totalVolume = sum of on-chain Sold event prices (NEVER hardcoded)`
- `communityShare = brainEmissions × 10%`

#### Locked Data Sources:
- Block range: 40,000 blocks (~22 hours) for activity feed
- Event types: Transfer (mints), Listed, Sold from NFT and Marketplace contracts
- Emissions: From Brain wallet (0xB0974F12C7BA2f1dC31f2C2545B71Ef1998815a4)
- Sales volume: From on-chain Sold events only (never hardcoded)

#### Protected Files (check for ⚠️ LOCKED comments):
```
client/src/components/PoolTracker.tsx
client/src/components/ValueEstimation.tsx
client/src/components/ActivityFeed.tsx
client/src/hooks/useActivityFeed.ts
client/src/hooks/useSubnetEmissions.ts
client/src/lib/mockData.ts
client/src/lib/constants.ts
```

### Architecture Insulation
Protected folder structure to isolate core commerce and game code:

```
/client/src/
├── core/                          ← PROTECTED: Commerce, auth, contracts
│   ├── PROTECTION_MANIFEST.json   ← Checksums for all protected files
│   ├── README.md                  ← Documents what's protected and why
│   ├── contracts/index.ts         ← Contract addresses
│   ├── commerce/                  ← Minting, marketplace, offers
│   ├── auth/                      ← Wallet connection, access control
│   ├── types.ts                   ← Shared TypeScript interfaces
│   └── index.ts                   ← Barrel export
│
├── game/                          ← ISOLATED: Self-contained game module
│   ├── engine/                    ← gameEngine.ts, gameRenderer.ts
│   ├── hooks/                     ← useGameAccess.ts, useGameScores.ts
│   └── index.ts                   ← Single export point
│
├── features/                      ← MODULAR: New features go here
│   ├── messaging/
│   └── leaderboard/
│
└── lib/featureFlags.ts            ← Feature toggle system
```

**Feature Flags** (lib/featureFlags.ts):
- Toggle features via localStorage for testing/emergency shutoff

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite
- **Styling**: Tailwind CSS v4 with shadcn/ui (New York style)
- **State Management**: TanStack Query (server state), React Context (app state)
- **Routing**: Wouter
- **Animations**: Framer Motion
- **UI/UX**: Dark theme with cyan accent (#00ffff), NFT cards display offer details, mobile-first responsive design, interactive lore explorer with discovery progress, animated discovery modal, dynamic price ticker, and optimized mobile wallet connect.

### Blockchain Integration
- **Wallet Connection**: RainbowKit + Wagmi
- **Chain**: BasedAI Mainnet (Chain ID 32323)
- **Contract Interaction**: ethers.js v6 for NFT contract data
- **NFT Contract**: 0xaE51dc5fD1499A129f8654963560f9340773ad59
- **V2 Marketplace Contract**: 0x2836f07Ed31a6DEc09E0d62Fb15D7c6c6Ddb139c
- **V3 Offers Contract**: 0x2a3f9D8b844c2dB2F42095B49817c0D6991514f3
- **NFT-Gated Features**: Guardian holders can send personal messages with offers.
- **Off-Chain Proposal System**: Gasless governance for proposals with admin review and multi-choice voting.
- **My Offers Dashboard**: Dedicated marketplace tab for managing user offers.
- **Diamond Hands Status**: Tracks NFT holding duration.
- **Guardian Profile**: Custom usernames stored in the database.

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Build**: esbuild (server), Vite (client)
- **Static Serving**: Express static middleware

### Data Flow
- NFT metadata from IPFS via Pinata gateway (with caching).
- Contract state from BasedAI RPC.
- Price data from CoinGecko API (free tier).

### Security Considerations
- Input sanitization (XSS, HTML stripping), CSP headers (helmet).
- Wallet address validation (Ethereum format regex).
- Admin wallet gating with header-based authentication.
  - **Known Limitation**: Current admin auth uses X-Wallet-Address header which can be spoofed. For full production security, implement EIP-191 signature verification.
- Profanity filter applied to all user-submitted content (feedback, stories).
- Rate limiting on API endpoints (general, write, auth, game).
- Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).
- CORS with origin validation.
- Sensitive data redaction in logs.

### Feature Specifications
- **Retro Defender Game**: 5-level space arcade minigame accessible to all users (`/game`). Guardian holders receive perks. Includes lifetime score tracking.
- **Pool Tracker Enhancements**: Comprehensive display of payment structure, including community treasury and ecosystem revenue breakdowns.
- **Interactive Lore Explorer**: Discover character backstories, locations, historical events, and factions of the Based Universe.
- **Lore-Gamification Integration**: Higher game ranks (Star Commander, Fleet Admiral, Based Eternal) require lore discovery progress (25%, 50%, 75% respectively) plus at least 1 game played. Ranks are locked until requirements are met, with UI showing unlock requirements.
- **Multi-language support**: 10 languages with a language selector.
- **Welcome Back messages**: Rotating messages for returning users.
- **Matrix Welcome Experience**: Premium typing animation welcome screen for new users and visitors returning after 24+ hours. Features "Wake up, Guardian..." Matrix-style reveal with beta phase messaging, skip functionality, and reduced-motion accessibility support.
- **In-App Notification Center**: Privacy-focused notification system using localStorage (no browser push notifications). Supports price alerts (configurable threshold 1-20%), new listings, sales, governance proposals, and game events. Features NotificationBell with unread count badge, NotificationDrawer with tabs (All/Unread/Types), per-wallet preferences, and mark-as-read functionality. Maximum 100 notifications per wallet with automatic oldest-first trimming.

## External Dependencies

### Blockchain Services
- **BasedAI RPC**: `https://mainnet.basedaibridge.com/rpc/`
- **Block Explorer**: `https://explorer.bf1337.org`

### IPFS/Storage
- **Pinata Gateway**: `https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/` (for NFT metadata and images)
- **Metadata CID**: `bafybeie3c5ahzsiiparmbr6lgdbpiukorbphvclx73dwr6vrjfalfyu52y`

### Price Feeds
- **CoinGecko API**: `https://api.coingecko.com/api/v3/simple/price` (for $BASED token price)

### Database
- **PostgreSQL**: Required for user data persistence (`DATABASE_URL` environment variable)

### Environment Variables Required
- `DATABASE_URL`
- Optional: `VITE_GA_ID`