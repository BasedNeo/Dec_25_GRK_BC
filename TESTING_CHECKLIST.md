# Based Guardians - Manual Testing Checklist

## Before Testing
- [ ] App loads remotely (not just Replit preview)
- [ ] No console errors on load
- [ ] All pages visible in navigation

---

## CRITICAL FEATURES (MUST ALL PASS)

### Wallet Connection
- [ ] Connect wallet button works
- [ ] Wallet address displays correctly
- [ ] Network detection works (BasedAI L1)
- [ ] Disconnect works

### NFT Display
- [ ] Guardians page loads
- [ ] NFT images load correctly
- [ ] NFT metadata displays (name, ID, traits)
- [ ] Pagination works

### Minting
- [ ] Mint button visible
- [ ] Price displays correctly
- [ ] "Mint Guardian" button responds to click
- [ ] Gas estimation works
- [ ] Transaction sends successfully
- [ ] Success message appears
- [ ] New NFT appears in collection

### Marketplace
- [ ] Marketplace page loads
- [ ] Listed NFTs display
- [ ] Prices show correctly
- [ ] Buy button works
- [ ] Transaction completes
- [ ] Listing updates after purchase
- [ ] Delist button works for owned NFTs

### Profile/Portfolio
- [ ] Profile page loads
- [ ] User's NFTs display
- [ ] Owned NFTs show correct images
- [ ] NFT count accurate
- [ ] Custom name can be set

### Activity Feed
- [ ] Activity page loads
- [ ] Recent transactions display
- [ ] Correct event types (mint, buy, sell)
- [ ] Timestamps accurate
- [ ] Links to transactions work

### Governance
- [ ] Proposals page loads
- [ ] Active proposals display
- [ ] Vote buttons work
- [ ] Vote count updates
- [ ] Admin can create proposals (if admin wallet)

### Pool Tracker
- [ ] Pool tracker page loads
- [ ] TVL displays (even if 0)
- [ ] Volume displays
- [ ] Brain status shows correctly
- [ ] No "undefined" or NaN values

### Games (if NFT owned)
- [ ] Arcade page loads
- [ ] Game cards display
- [ ] Click game card opens game
- [ ] Game loads and is playable
- [ ] Exit game works
- [ ] Points tracked correctly

---

## PERFORMANCE CHECKS

- [ ] Initial load < 3 seconds
- [ ] Page navigation feels instant
- [ ] No lag when scrolling
- [ ] Images load progressively
- [ ] No frozen UI
- [ ] Mobile responsive

---

## ERROR HANDLING

- [ ] Wrong network shows warning banner
- [ ] No wallet connected shows appropriate message
- [ ] Failed transactions show error message
- [ ] Loading states show during operations
- [ ] No infinite spinners

---

## SECURITY CHECKS

- [ ] Can't mint without connected wallet
- [ ] Can't buy without sufficient balance
- [ ] Can't vote without wallet
- [ ] Admin features only visible to admin
- [ ] No exposed API keys in console
- [ ] No sensitive data in network tab

---

## FINAL GO/NO-GO

### LAUNCH READY IF:
- All Critical Features pass
- No console errors
- Performance acceptable
- Security checks pass

### DO NOT LAUNCH IF:
- Any critical feature fails
- App doesn't load remotely
- Console errors present
- Transactions failing

---

## Test Results

**Date:** _______________
**Tester:** _______________

### Summary
- Passed: ___
- Failed: ___
- Skipped: ___

### Notes
_Record any issues found during testing:_

