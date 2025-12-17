# PROTECTED CORE - READ BEFORE MODIFYING

This folder contains **mission-critical commerce functions** that have been tested
and verified to work correctly. Modifications require careful review.

## MODIFICATION RULES

1. **NEVER modify without creating a backup first**
2. **Test ALL commerce functions after any change**
3. **Document any changes in the changelog below**

## What's Protected

| File | Purpose | Last Verified |
|------|---------|---------------|
| `commerce/useMint.ts` | NFT minting (8M gas) | Dec 2024 |
| `commerce/useMarketplace.ts` | Listings, buying | Dec 2024 |
| `commerce/useOffers.ts` | V3 offer system | Dec 2024 |
| `contracts/index.ts` | Contract addresses | Dec 2024 |
| `auth/useIsGuardianHolder.ts` | NFT gate check | Dec 2024 |

## Required Tests After Changes

- [ ] Mint 1 NFT successfully
- [ ] List NFT for sale
- [ ] Buy listed NFT
- [ ] Make offer (V3 signature)
- [ ] Cancel offer
- [ ] Game gate blocks non-holders
- [ ] Game gate allows holders

## Changelog

| Date | Change | Author |
|------|--------|--------|
| Dec 2024 | Initial protection setup | - |
