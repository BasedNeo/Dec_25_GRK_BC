# Changelog

All notable changes to the Based Guardians Command App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2025-12-18

### Added - Based Arcade (Games)

#### Guardian Defense (`GuardianDefense.tsx`)
- Premium Missile Command reimagining
- 10 waves of increasing difficulty
- 3 defensive batteries with limited ammo
- 4 cities to protect
- Chain reaction explosions
- 5-layer parallax background with shooting stars
- Color-coded missiles (green/red/yellow)
- Mobile-first tap controls
- Free to play for all users

#### Guardian Solitaire (`GuardianSolitaire.tsx`)
- Klondike Solitaire with NFT cards
- Full Klondike rules (7 tableau piles, 4 foundations)
- NFT images as custom card faces
- Elegant glow effects on selected cards
- Time-based scoring with move efficiency
- NFT ownership required to play

#### Asteroid Mining (`AsteroidMining.tsx`)
- Hybrid space shooter/collector
- Asteroid breakdown mechanics (Large -> Medium -> Small)
- Resource collection system
- Shield-based lives (3 hits)
- Power-ups (Shield Boost, Rapid Fire, Score Multiplier)
- Progressive difficulty
- 3D rotation effects on asteroids
- NFT ownership required to play

#### Game Infrastructure
- `gameRegistry.ts`: Centralized configuration for all games
- `gameStorage.ts`: Unified localStorage management for saves/stats
- `GameHUD.tsx`: Reusable in-game heads-up display
- `VictoryScreen.tsx`: Reusable end-game celebration screen
- NFT gating system (checks wallet balance, no transaction needed)
- Bot protection across all games:
  - Minimum play duration enforcement
  - Action throttling (50ms minimum between actions)
  - Randomization to prevent scripting
- Balanced points economy (all games max 50,000 points)
- Daily play limits (10 plays per game)

### Added - Performance Optimizations

#### Memory Leak Fixes
- Added proper cleanup to all `useEffect` hooks
- Implemented `isMounted` flags for async operations
- Fixed game canvas cleanup on component unmount
- Fixed polling hooks (`useActivityFeed`, `useSubnetEmissions`, `PriceTicker`)
- Cleared all timers and intervals on unmount
- Removed event listeners on cleanup

#### Rendering Optimizations
- Implemented marketplace pagination (20 items per page)
- Added `React.memo` to frequently re-rendered components
- Used `useMemo` for expensive filter/sort operations
- Implemented code splitting with lazy-loaded routes
- Added loading fallbacks for all routes

#### RPC Optimizations
- Created `rpcCache.ts` with intelligent caching (10-30s TTL)
- Implemented request batching with `Promise.all()`
- Applied caching to `useTotalSupply`, `useMarketplace`, etc.

### Added - Error Handling

- Wrapped all routes in `<ErrorBoundary>` components
- Enhanced `ErrorBoundary.tsx` with user-friendly fallback UI
- Added "Try Again" and "Go Home" recovery buttons
- Prevented component errors from crashing entire app

### Added - Admin Features

- Feature flags system (database-backed)
- Proposal cancellation system (soft delete preserving history)
- Pool Tracker data toggle (live vs "Coming Soon")
- Performance report viewer in Admin Dashboard
- RPC status display
- Storage health monitoring

### Fixed

#### Activity Feed
- Extended event history from 2,000 to 2,592,000 blocks (60 days)
- Implemented RPC multi-endpoint failover
- Added retry logic for failed RPC calls
- Fixed "No healthy RPC endpoint available" errors
- Improved event parsing for all event types

#### Price Ticker
- Fixed intermittent blank display
- Added multiple price sources (CoinGecko, Binance, CoinCap)
- Implemented localStorage caching for last known prices
- Added stale data detection with visual indicator
- Display last known price until fresh data available

#### Pool Tracker
- Fixed "Brain is inactive" false reporting
- Improved status detection logic
- Added fallback to cached data if RPC fails
- Enhanced console logging for debugging

#### Volume Tracking
- Reset `CUMULATIVE_SALES_BASELINE` to zero
- Implemented real-time blockchain scanning
- Track all mints and secondary sales from any source
- Accurate on-chain volume calculation

#### Marketplace
- Fixed race conditions in buy/sell/list operations
- Added SafeMath for all price calculations
- Improved error messages
- Fixed pagination edge cases

### Security Enhancements

- Applied rate limiting to all API endpoints:
  - `apiLimiter`: 100 req/15min (general)
  - `writeLimiter`: 10 req/15min (mutations)
  - `gameLimiter`: 50 req/15min (games)
- Implemented request deduplication in financial operations
- Added AsyncMutex to prevent race conditions
- Enhanced input sanitization
- Improved error message security (no technical details exposed)

### Documentation

- Created `ARCHITECTURE.md` - Complete system architecture overview
- Created `DEVELOPMENT_GUIDE.md` - Developer onboarding and standards
- Updated `README.md` - Project overview and quick start
- Created `CHANGELOG.md` - Version history (this file)
- Created `VERIFICATION.md` - Production readiness report
- Added inline code comments for complex logic

### Code Quality

- Removed debug `console.log` statements
- Cleaned up unused imports
- Removed commented-out code blocks
- Standardized error messages
- Improved TypeScript type coverage
- Created central `types/index.ts` file
- Added explicit return types to functions
- Eliminated `any` types
- Added props interfaces to all components

### Dependencies

- Documented all dependencies in code
- Updated `.env.example` with all required variables
- Fixed security vulnerability in on-headers

---

## [0.9.0] - Previous Features (Pre-2025-12-18)

### Core Features Implemented
- NFT minting with custom names
- Marketplace (buy/sell/list NFTs)
- Offers system (V2 on-chain, V3 off-chain with signatures)
- Governance and voting system
- Activity feed with event tracking
- User profiles with NFT collections
- Pool tracker for emissions
- Admin dashboard
- Multi-language support (i18n)
- Price ticker (BTC/ETH)
- Custom name system with profanity filter
- Revenue split calculations
- SafeMath implementation
- SafeTransaction system
- RPC provider failover
- Secure storage wrapper
- Error reporter
- Analytics tracking

---

## Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** version for breaking changes
- **MINOR** version for new features (backwards-compatible)
- **PATCH** version for bug fixes (backwards-compatible)

---

## Upcoming

See [Roadmap in README.md](./README.md#roadmap) for planned features.
