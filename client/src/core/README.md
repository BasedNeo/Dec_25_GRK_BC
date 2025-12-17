# PROTECTED CORE - READ BEFORE MODIFYING

This folder contains **mission-critical commerce functions** that have been tested
and verified to work correctly. Modifications require careful review.

## Core Protection System

A protection manifest (`PROTECTION_MANIFEST.json`) tracks all critical files with SHA-256 checksums.

### Commands (run from project root)
```bash
# Verify integrity of all protected files
npx tsx script/backup-core.ts verify

# Create backups of all protected files
npx tsx script/backup-core.ts backup

# Restore a file from backup
npx tsx script/backup-core.ts restore <file-path>

# List all backups for a file
npx tsx script/backup-core.ts list <file-path>
```

### Example
```bash
npx tsx script/backup-core.ts verify
npx tsx script/backup-core.ts backup
npx tsx script/backup-core.ts restore client/src/core/commerce/useMint.ts
```

## MODIFICATION RULES

1. **NEVER modify without creating a backup first**
2. **Test ALL commerce functions after any change**
3. **Document any changes in the changelog below**
4. **Run `verify` before deploying**

## What's Protected

| File | Purpose | Criticality | Locked |
|------|---------|-------------|--------|
| `commerce/useMint.ts` | NFT minting (69,420 $BASED) | CRITICAL | No |
| `commerce/useMarketplace.ts` | Listings, buying | CRITICAL | No |
| `commerce/useOffers.ts` | V3 offer system | HIGH | No |
| `contracts/index.ts` | Contract addresses | CRITICAL | No |
| `auth/useIsGuardianHolder.ts` | NFT gate check | HIGH | No |
| `../lib/constants.ts` | Revenue splits, addresses | CRITICAL | YES |
| `../lib/mockData.ts` | Treasury calculations | HIGH | YES |

**LOCKED files** will cause the verify command to FAIL if modified.

## Required Tests After Changes

- [ ] Mint 1 NFT successfully
- [ ] List NFT for sale
- [ ] Buy listed NFT
- [ ] Make offer (V3 signature)
- [ ] Accept offer
- [ ] Cancel offer
- [ ] Game gate blocks non-holders
- [ ] Game gate allows holders

## Backup Location

Backups are stored in `.core-backups/` with timestamps and metadata.
Up to 50 versions are kept per file.

## Changelog

| Date | Change | Author |
|------|--------|--------|
| Dec 2024 | Added protection manifest and backup system | - |
| Dec 2024 | Initial protection setup | - |
