# Based Guardians Command App

A cyberpunk-themed NFT DApp for the BasedAI blockchain (Chain ID: 32323).

## Features

### NFT Platform
- **Minting**: Mint Guardian NFTs with optional custom names
- **Marketplace**: Buy, sell, and trade with 1% platform fee
- **Offers**: Make and accept offers (on-chain V2 and off-chain V3 with signatures)
- **Activity Feed**: Real-time on-chain event tracking (60-day history)
- **Custom Profiles**: Personalize your Guardian with unique names

### Based Arcade (Games)
- **Guardian Defense** - Free-to-play Missile Command style defense game
- **Guardian Solitaire** - NFT-exclusive Klondike Solitaire with NFT cards
- **Asteroid Mining** - NFT-exclusive space shooter/resource collector

All games feature:
- Balanced points economy (50K max per game)
- Bot protection (minimum duration, action throttling)
- Daily play limits (10 plays per day)
- Premium alien-themed visuals
- Mobile-optimized controls

### Governance
- **Proposals**: Community-driven governance
- **Voting**: NFT-weighted on-chain voting
- **Admin Tools**: Proposal management with safety checks

### Analytics & Tracking
- **Pool Tracker**: Real-time emissions and volume data
- **Price Ticker**: Live BTC/ETH prices with fallback sources
- **User Profiles**: View NFT collections and stats

## Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS + Framer Motion (animations)
- Wagmi + RainbowKit (wallet connectivity)
- Ethers.js v6

**Backend**
- Express.js
- PostgreSQL + Drizzle ORM
- Helmet + CORS (security)
- Express Rate Limit (DoS protection)

**Blockchain**
- BasedAI Layer 1 (Chain ID: 32323)
- Multi-RPC failover for reliability
- Intelligent caching (10-30s TTL)

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run db:push

# Start development server
npm run dev
```

### Environment Variables

See `.env.example` for all required variables. Key ones:
- `VITE_GUARDIAN_NFT_ADDRESS` - Guardian NFT contract
- `VITE_MARKETPLACE_ADDRESS` - Marketplace contract  
- `VITE_RPC_ENDPOINT_PRIMARY` - Primary RPC endpoint
- `VITE_WALLETCONNECT_PROJECT_ID` - WalletConnect ID

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities (safeMath, gameRegistry, etc.)
│   │   ├── core/           # Critical business logic
│   │   └── types/          # TypeScript type definitions
├── server/                 # Express backend
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Database queries
│   └── index.ts            # Server entry
├── shared/                 # Shared code
│   └── schema.ts           # Database schema (Drizzle)
└── script/                 # Utility scripts
```

## Core File Protection

Critical files are protected with automated backups:

- `npm run core:verify` - Check integrity before deploy
- `npm run core:backup` - Create backups of all protected files
- `npm run core:restore <file>` - Restore from backup
- `npm run core:list <file>` - List available backups

Protected files include:
- useMint.ts (69,420 $BASED mint price)
- useMarketplace.ts (buy/sell/list logic)
- constants.ts (contract addresses, revenue splits)
- safeMath.ts (financial calculations)

Always run `npm run core:verify` before deploying!

## Security Features

- **SafeMath**: BigInt precision for financial calculations
- **SafeTransaction**: Pre-flight checks (gas estimation, balance verification)
- **AsyncMutex**: Prevents race conditions in critical sections
- **RequestDeduplicator**: Prevents duplicate concurrent requests
- **SecureStorage**: Integrity-checked localStorage wrapper
- **API Rate Limiting**: Protection against DoS attacks
- **Error Boundaries**: Graceful error handling and recovery
- **Memory Leak Prevention**: Proper cleanup in all hooks and games

## Performance Optimizations

- Code splitting with lazy-loaded routes
- RPC call caching (10-30s TTL)
- Marketplace pagination (20 items/page)
- Optimized re-renders with memoization
- Canvas cleanup in games
- Multi-RPC failover
- Performance monitoring system

## Revenue Model

- **Minting**: 69,420 $BASED per NFT (100% to treasury)
- **Platform Fee**: 1% on all marketplace sales (to treasury)
- **Royalties**: 10% on secondary sales
  - 6% to Treasury Wallet
  - 4% to Original Creator

## Documentation

- **[Architecture Overview](./ARCHITECTURE.md)** - System design and data flows
- **[Development Guide](./DEVELOPMENT_GUIDE.md)** - How to contribute and develop

## Testing

```bash
# Type check
npx tsc --noEmit

# Build for production
npm run build

# Preview production build
npm run preview

# Check for security issues
npm audit
```

## Roadmap

- [ ] Leaderboard system for games
- [ ] Achievement system
- [ ] NFT staking
- [ ] Additional games
- [ ] Mobile app (React Native)
- [ ] Social features (comments, likes)

## Contributing

We welcome contributions! Please see [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) for:
- Code standards
- Development workflow
- Testing requirements
- Common patterns

## License

[Add your license here]

## Support

For issues or questions:
1. Check documentation in `/docs`
2. Search existing issues
3. Create a new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

---

**Built with love for the BasedAI community in the Giga Brain Galaxy**
