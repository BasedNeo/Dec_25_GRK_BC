# Based Guardians Command App

## Overview

Based Guardians is a cyberpunk-themed NFT DApp built for the BasedAI blockchain (Chain ID 32323). The application enables users to mint, view, trade, and participate in advisory governance for the Based Guardians NFT collection of 3,732 unique NFTs (1,776 Guardians, 1,320 Frogs, 636 Creatures).

Key features include:
- NFT minting at 69,420 $BASED per NFT
- Live collection gallery with metadata from IPFS
- OpenSea-style marketplace V2 (NFT stays in wallet until sold)
- Advisory DAO voting system
- Community pool tracking with emissions calculations
- Real-time $BASED token price feeds from CoinGecko
- User gamification with 8 levels, badges, and Diamond Hands status tracking
- Custom Guardian names with wallet suffix (e.g., "Hero#A4F")
- Welcome back messages for returning users (after 24+ hours)
- Multi-language support (10 languages) with language selector

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

### Architecture Insulation (December 2024)

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
- Flags: mintingEnabled, marketplaceEnabled, offersV3Enabled, gameEnabled, etc.

**Core Protection System** (script/backup-core.ts):
- SHA-256 checksums track all protected files
- Backups stored in `.core-backups/` (50 versions max per file)
- Commands: `npx tsx script/backup-core.ts verify|backup|restore|list`
- LOCKED files (constants.ts, mockData.ts, schema.ts) fail verification if modified

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite bundler
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **State Management**: TanStack Query for server state, React Context for app state
- **Routing**: Wouter for lightweight client-side routing
- **Animations**: Framer Motion for UI animations

### Blockchain Integration
- **Wallet Connection**: RainbowKit + Wagmi for wallet connectivity
- **Chain**: BasedAI Mainnet (Chain ID 32323, RPC: https://mainnet.basedaibridge.com/rpc/)
- **Contract Interaction**: ethers.js v6 for reading NFT contract data
- **NFT Contract**: 0xaE51dc5fD1499A129f8654963560f9340773ad59

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM (schema in shared/schema.ts)
- **Build**: Custom build script using esbuild for server, Vite for client
- **Static Serving**: Express static middleware serves built client assets

### Data Flow
- NFT metadata fetched from IPFS via Pinata gateway
- Contract state read directly from BasedAI RPC
- Price data from CoinGecko API (free tier, no key required)
- Metadata caching implemented for performance

### Security Considerations
- Input sanitization for all external data (XSS protection)
- Content Security Policy headers via helmet middleware
- Wallet address validation
- Admin wallet gating for privileged operations (0xAe543104fDBe456478E19894f7F0e01f0971c9B4)
- Rate limiting on all API endpoints:
  - API limiter: 100 req/15min for general endpoints
  - Write limiter: 10 req/min for POST/PATCH/DELETE operations
  - Auth limiter: 20 req/15min (wallet+IP based)
  - Game limiter: 5 req/min for score submissions
- Security headers via helmet: CSP, HSTS (1 year), X-Frame-Options, X-Content-Type-Options
- CORS configuration with origin validation
- Sensitive data redaction in logs

## External Dependencies

### Blockchain Services
- **BasedAI RPC**: https://mainnet.basedaibridge.com/rpc/ - Primary blockchain node
- **Block Explorer**: https://explorer.bf1337.org - Transaction verification

### IPFS/Storage
- **Pinata Gateway**: https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/ - NFT metadata and images
- **Metadata CID**: bafybeie3c5ahzsiiparmbr6lgdbpiukorbphvclx73dwr6vrjfalfyu52y

### Price Feeds
- **CoinGecko API**: https://api.coingecko.com/api/v3/simple/price - $BASED token price (basedai ID)

### Database
- **PostgreSQL**: Required for user data persistence (DATABASE_URL environment variable)

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- Optional: `VITE_GA_ID` - Google Analytics tracking ID

## Recent Changes (December 2024)

- **Off-Chain Proposal System**: Complete gasless governance system for creating and voting on proposals
  - Admin form with title, description, category, and A/B/C/D voting options
  - Review workflow: proposals start in "review" status, admin can approve to make "active" or delete
  - Multi-choice voting: users vote on options A/B/C/D with voting power = NFT count
  - Database tables: `proposals` and `proposal_votes` for persistent storage
  - API endpoints: POST/GET/PATCH/DELETE /api/proposals, POST /api/proposals/:id/vote
  - Hook: useProposals.ts with useProposals, useProposalVotes, useProposalMutations
- **My Offers Dashboard**: Dedicated "MY OFFERS" tab in marketplace with filter tabs (All/Active/Accepted/Expired), edit/cancel functionality, NFT thumbnails, and time remaining indicators
  - useMyOffers hook fetches offers from both V3 (off-chain) and V2 (on-chain) sources
  - Active offers badge shows count on tab trigger
- Added V3 Off-Chain Offers System (Aftermint-style): Gasless offer making using EIP-712 signatures, buyers sign messages for free, sellers accept and buyers complete with on-chain tx
  - V3 Contract: 0x2a3f9D8b844c2dB2F42095B49817c0D6991514f3
  - Hook: useOffersV3.ts with makeOffer, acceptOffer, completePurchase, cancelOffer
  - MyOffersPanel component shows user's active offers with status badges
- **Performance Optimizations**: React.memo on heavy components (MarketCard, NFTImage, RarityChart), lazy loading for AdminDashboard and BrainDiagnostics, useMemo for filter operations
- **Security Hardening**: Input validation on OfferModal and ListModal (price range: 1-999,999,999), all external links verified with rel="noopener noreferrer"
- **UX Polish**: LoadingSpinner component, NFTCardSkeleton for loading states, useDebouncedCallback hook for rate limiting
- **Code Cleanup**: Removed debug console.log statements, improved type safety (any -> unknown), silent error handling
- V2 Marketplace (0x2836f07Ed31a6DEc09E0d62Fb15D7c6c6Ddb139c) still active for backward compatibility
- Added Diamond Hands Status feature: Tracks NFT holding duration and retention rate via blockchain Transfer events (6 levels: Ice → Diamond)
- Added Guardian Profile system: Custom usernames with wallet suffix for uniqueness, stored in database
- Added Welcome Back messages: 4 rotating messages for users returning after 24+ hours
- Added Internationalization (i18n): Language selector in lower-right corner, supports 10 languages (EN, ES, ZH, JA, KO, DE, FR, PT, RU, AR)
- Added first-time visitor name prompt modal
- Database: Added `guardian_profiles` table for username and login tracking
- Minting gas limit: 8,000,000, gas price: 10 gwei
- Added Uniswap Wallet support to RainbowKit wallet modal (in Popular section)
- NFT cards in portfolio now display offer details with Accept/Decline buttons directly visible
- Mobile wallet connect optimized: Custom styled connect button matching desktop, full wallet list scrollable, touch-friendly 56px minimum targets
- RainbowKit modal CSS polish: Mobile-first responsive design, proper icon sizing, all wallet groups visible
- NFT-Gated Offer Messaging: Guardian holders (1+ NFT) can send personal messages with offers
  - useIsGuardianHolder hook checks NFT ownership via balanceOf
  - Messages are sanitized with DOMPurify, max 280 characters
  - Non-holders see unlock prompt with Mint/Buy CTAs
  - Messages displayed with "GUARDIAN HOLDER" badge in received offers
  - Rate limiting: max 5 offers per hour
  - Auto-cleanup prevents localStorage overflow
- **Retro Defender Game**: 5-level space arcade minigame accessible to ALL users via "Game" nav item (last menu option)
  - Route: /game (GuardianDefender.tsx)
  - Game renamed from "Guardian Defender" to "Retro Defender" 
  - Open access: No wallet or NFT required to play (20 plays/day limit, 30s cooldown)
  - Custom entities: "FUD" text (red neon) as grunt aliens, custom FUD alien sprite for bee aliens
  - Guardian holders get perks: +1 life, 1.5x score multiplier, green ship
  - "Race-to-Base" teaser shown: "Coming Soon - It will be incredible"
  - Levels 1-4: Galaga-style shooter with unique alien types
  - Level 5: Lunar Lander physics-based landing
  - Responsive canvas with mobile touch controls
  - Lifetime score tracking with 6 rank tiers (Cadet → Based Eternal)
- **Price Ticker Enhancements**: 8-second rotation between $BASED and BTC/ETH prices
  - Fixed-width box (175px/190px) to prevent layout shift
  - Elegant blur/fade/scale transitions (0.6s duration)
  - Multi-source validation (Binance primary, CoinGecko fallback)
- **Mobile Marketplace Fixes**: Improved touch targets for Make Offer button (min 44px height)
  - Added touch-manipulation and active states for better mobile feedback
- **Pool Tracker Enhancement** (December 2024): Comprehensive payment structure display
  - Community Treasury card: Shows mint revenue (51%), royalty revenue (2%), emissions (10%)
  - New Ecosystem Revenue card: Full breakdown of all revenue streams and wallet allocations
  - Shows mint/royalty splits to Treasury, Creator, and Royalty wallets
  - Platform fee (1%) tracking
  - Mobile-responsive design with proper data-testid attributes
  - All calculations use locked 51/49 MINT_SPLIT values
- **Interactive Lore Explorer** (December 2024): Discover the deep lore of the Based Universe
  - 12 unique character backstories across 3 species (Guardians, Frogs, Creatures)
  - 6 locations with hidden stories (unlock by clicking locked cards)
  - 6 historical timeline events
  - 4 factions with mottos and notable members
  - Secret lore unlock mechanic: Each character has hidden backstory
  - Discovery progress bar tracking unlocked content
  - localStorage persistence for discovery state
  - Animated discovery modal with particle effects
  - Integrated into Universe tab as dedicated section
  - Files: LoreExplorer.tsx, loreData.ts

## Wallet Configuration

### Supported Wallets (wagmi.ts)
**Popular Group:**
- Injected Wallet (browser extension detection)
- MetaMask
- Coinbase Wallet
- Uniswap Wallet
- Rainbow
- Trust Wallet

**More Options Group:**
- WalletConnect
- Rabby
- Phantom
- Zerion
- OKX Wallet
- Brave Wallet

**Advanced Group:**
- Ledger
- Safe
- Argent

### RainbowKit Configuration
- Modal size: wide
- Theme: darkTheme with cyan accent (#00ffff)
- Initial chain: BasedAI (32323)
- Recent transactions: enabled