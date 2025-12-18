# Based Guardians Command App

A cyberpunk-themed NFT DApp for the BasedAI blockchain (Chain ID: 32323).

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
