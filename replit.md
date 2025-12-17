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

### LOCKED CALCULATIONS (Do NOT modify without explicit user request)
The following calculations and formulas are LOCKED and should NOT be changed:
- **PoolTracker.tsx**: Treasury calculations (mint revenue, royalty revenue, emissions)
- **ValueEstimation.tsx**: Backed value per NFT, community treasury display
- **useActivityFeed.ts**: Total volume calculation with baseline (CUMULATIVE_SALES_BASELINE)
- **constants.ts**: MINT_SPLIT, ROYALTY_SPLIT, CUMULATIVE_SALES_BASELINE values
- Formula: mintRevenue = minted × 69,420 × 51%
- Formula: royaltyRevenue = salesVolume × 2%
- Formula: backedValue = totalTreasury ÷ mintedNFTs

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
- Content Security Policy headers
- Wallet address validation
- Admin wallet gating for privileged operations (0xAe543104fDBe456478E19894f7F0e01f0971c9B4)

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