# BasedAI Guardian DApp - Architecture Overview

## System Architecture

### Frontend (React + TypeScript + Vite)
```
client/
├── src/
│   ├── components/   # Reusable UI components (Navbar, ErrorBoundary, etc.)
│   ├── pages/        # Route-level pages (Mint, Marketplace, Games, etc.)
│   ├── hooks/        # Custom React hooks (useActivityFeed, useMarketplace, etc.)
│   ├── lib/          # Utilities (gameRegistry, gameStorage, safeMath, etc.)
│   ├── core/         # Critical business logic (commerce with useMint)
│   └── types/        # TypeScript type definitions
```

### Backend (Express + PostgreSQL)
```
server/
├── routes.ts         # API endpoints
├── storage.ts        # Database queries
└── index.ts          # Server entry point

shared/
└── schema.ts         # Drizzle ORM schema
```

## Data Flow Examples

### Minting Flow
```
User clicks Mint
→ useMint hook validates inputs
→ SafeMath calculates total cost
→ SafeTransaction.preFlightCheck (gas + balance)
→ AsyncMutex.runExclusive (prevent double-mint)
→ RequestDeduplicator.execute
→ Contract.mint() transaction sent
→ SafeTransaction.waitForConfirmation
→ Activity feed updates
→ Analytics tracked
```

### Marketplace Purchase Flow
```
User clicks Buy
→ useMarketplace hook validates
→ SafeTransaction.preFlightCheck
→ Contract.buyNFT() transaction
→ SafeTransaction.waitForConfirmation
→ RPC cache invalidated for listings
→ Marketplace data refreshes
→ Analytics tracked
```

### Game Flow
```
User selects game in arcade
→ NFT balance check (if required)
→ Daily play limit check (gameStorage)
→ Game loads with saved settings
→ Game loop starts (requestAnimationFrame)
→ User plays (bot protection enforced)
→ Game ends (minimum duration check)
→ Score calculated and validated
→ Stats saved (gameStorage)
→ Victory screen displays
```

## Core Systems

### 1. NFT Minting System
- **Primary File**: `client/src/core/commerce/useMint.ts`
- **UI**: `client/src/pages/Mint.tsx`
- **Features**: 
  - Safe transaction handling with pre-flight checks
  - Gas estimation and balance verification
  - Custom name assignment
  - Analytics tracking
- **Security**: 
  - SafeMath for price calculations
  - AsyncMutex to prevent race conditions
  - Request deduplication
  - Balance verification before transaction

### 2. Marketplace System
- **Primary Hook**: `client/src/hooks/useMarketplace.ts`
- **UI**: `client/src/pages/Marketplace.tsx`
- **Features**:
  - NFT listing with seller-set prices
  - Direct buying
  - On-chain offers (V2)
  - Off-chain offers with signatures (V3) via `useOffersV3.ts`
  - Pagination (20 items per page)
  - Filtering and sorting
- **Revenue Split**:
  - 1% platform fee to treasury
  - 10% royalties on secondary sales (6% treasury, 4% creator)

### 3. Games Ecosystem (Based Arcade)
- **Hub**: `client/src/pages/BasedArcade.tsx`
- **Registry**: `client/src/lib/gameRegistry.ts` - Centralized game configuration
- **Storage**: `client/src/lib/gameStorage.ts` - Unified save/stats management
- **Shared Components**:
  - `client/src/components/game/GameHUD.tsx` - In-game display
  - `client/src/components/game/VictoryScreen.tsx` - End-game screen

#### Games:
1. **Guardian Defense** (`GuardianDefense.tsx`)
   - Type: Missile Command style defense
   - Access: Free for all users
   - Features: 10 waves, 3 batteries, 4 cities, chain reactions, 5-layer parallax
   - Max Score: 50,000 points

2. **Guardian Solitaire** (`GuardianSolitaire.tsx`)
   - Type: Klondike Solitaire with NFT cards
   - Access: NFT holders only
   - Features: Full Klondike rules, NFT card faces, elegant glow effects
   - Max Score: 50,000 points

3. **Asteroid Mining** (`AsteroidMining.tsx`)
   - Type: Hybrid space shooter/resource collector
   - Access: NFT holders only
   - Features: Asteroid breakdown, resources, power-ups, shield lives
   - Max Score: 50,000 points

#### Game Security:
- NFT gating for premium games (wallet balance check, no transaction needed)
- Daily play limits (10 plays per game)
- Bot protection:
  - Minimum play duration checks
  - Action throttling (50ms minimum between actions)
  - Randomization in game elements
  - Score validation

### 4. Governance System
- **Hook**: `client/src/hooks/useGovernance.ts`
- **UI**: `client/src/pages/Governance.tsx`
- **Features**:
  - Admin-only proposal creation with form validation
  - All users can vote (weighted by NFT holdings)
  - Admin proposal management:
    - Triple-confirmation delete system
    - Soft cancellation (preserves history)
  - Voting period enforcement
  - On-chain execution

### 5. Activity Feed
- **Hook**: `client/src/hooks/useActivityFeed.ts`
- **UI**: `client/src/components/ActivityFeed.tsx`
- **Features**:
  - Real-time on-chain event tracking
  - 60-day event history (2,592,000 blocks)
  - Event types: Mint, Sale, Listing, Transfer, Offer
  - RPC failover for reliability
  - 30-second polling interval

### 6. Pool Tracker
- **Hook**: `client/src/hooks/useSubnetEmissions.ts`
- **UI**: `client/src/components/PoolTracker.tsx`
- **Features**:
  - Brain subnet status tracking
  - Emissions per block calculation
  - Volume tracking (mints + secondary sales)
  - Revenue breakdown by recipient
  - Admin toggle for live data vs "Coming Soon" display

### 7. Custom Names
- **Database**: `guardian_profiles` table in PostgreSQL
- **Features**:
  - Unique name assignment per NFT
  - Profanity filtering
  - Admin moderation tools

## Performance Architecture

### Memory Leak Prevention
- All `useEffect` hooks include cleanup functions
- `isMounted` flags for async operations
- Timer cleanup via `return` statements
- Canvas cleanup on game unmount
- Event listener removal

### RPC Management
- **Multi-endpoint failover**: `client/src/lib/rpcProvider.ts`
- **Caching**: `client/src/lib/rpcCache.ts` (10-30s TTL)
- **Request batching**: `Promise.all()` for parallel calls
- **Retry logic**: Automatic retry with exponential backoff

### Rendering Optimization
- Code splitting with `React.lazy()`
- Route-based lazy loading
- Marketplace pagination
- `React.memo` on frequently re-rendered components
- `useMemo` / `useCallback` for expensive operations

### Error Handling
- Error boundaries on all routes
- Graceful degradation
- User-friendly error messages
- Centralized error reporting: `client/src/lib/errorReporter.ts`

## Security Architecture

### Financial Safety
- **SafeMath** (`client/src/lib/safeMath.ts`): BigInt precision arithmetic
- **SafeTransaction** (`client/src/lib/safeTransaction.ts`): Pre-flight checks
- **AsyncMutex** (`client/src/lib/asyncMutex.ts`): Prevent race conditions
- **RequestDeduplicator** (`client/src/lib/requestDeduplicator.ts`): Prevent duplicate requests
- **useButtonLock** hook: Prevent double-clicks

### Data Protection
- **SecureStorage** (`client/src/lib/secureStorage.ts`): Integrity-checked localStorage
- Input sanitization on all user inputs
- XSS protection via React's built-in escaping
- API rate limiting on backend

### Backend Security (server/)
- **Helmet**: Security headers (XSS, clickjacking protection)
- **CORS**: Configured origin restrictions
- **Rate limiting**: 
  - `apiLimiter`: 100 requests/15min
  - `writeLimiter`: 10 requests/15min for mutations
  - `gameLimiter`: 50 requests/15min for game endpoints
- **Secure logging**: Sensitive data redaction

## Database Schema (PostgreSQL)

**Tables:**
- `guardian_profiles`: Custom names for NFTs
- `proposals`: Governance proposals and votes
- `feature_flags`: Dynamic feature toggles
- `analytics_events`: User action tracking
- `analytics_aggregates`: Aggregated metrics

**ORM**: Drizzle ORM (`shared/schema.ts`)

## External Dependencies

### Blockchain
- **Network**: BasedAI Layer 1 (Chain ID: 8453)
- **Contracts**:
  - Guardian NFT (ERC-721)
  - Marketplace V2
  - Offers V3
  - Governance
- **Libraries**: wagmi, viem, ethers.js v6

### APIs
- **Price feeds**: CoinGecko, Binance, CoinCap (with fallbacks)
- **RPC endpoints**: Multiple with health checks

## Deployment

- **Platform**: Replit
- **Build**: Vite (`npm run build`)
- **Start**: `npm start` (serves frontend + backend)
- **Database**: PostgreSQL managed by Replit
- **Environment**: See `.env.example` for required variables

## Monitoring

- **Performance Monitor**: `client/src/lib/performanceMonitor.ts`
  - Tracks operation timing
  - Warns on slow operations (>1s)
  - Accessible via Admin Dashboard
- **Error Reporter**: `client/src/lib/errorReporter.ts`
  - Logs all errors with context
  - Exportable for analysis
- **Analytics**: `client/src/lib/analytics.ts`
  - Tracks user actions
  - Conversion funnel
  - Game engagement metrics

---

For detailed development instructions, see `DEVELOPMENT_GUIDE.md`.
