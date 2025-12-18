# 🧪 Manual Commerce Test Protocol

Run BEFORE every production deployment. Check ALL boxes.

## Prerequisites
- [ ] Development server running (`npm run dev`)
- [ ] Test wallet with $BASED tokens
- [ ] Clean browser (clear localStorage, cookies)
- [ ] Desktop + mobile device ready

---

## TEST 1: MINT FLOW (CRITICAL)

### Setup
- Navigate to /mint
- Connect test wallet
- Verify balance shown correctly

### Test Cases
- [ ] **T1.1** - Display shows correct mint price (69,420 $BASED)
- [ ] **T1.2** - Display shows remaining supply accurately
- [ ] **T1.3** - Click "Mint 1 NFT" → Wallet prompts for approval
- [ ] **T1.4** - Confirm transaction → Shows "Minting..." status
- [ ] **T1.5** - Wait for confirmation → Shows success message
- [ ] **T1.6** - Navigate to Portfolio → New NFT appears

### Expected Behavior
✅ Mint price matches 69,420 $BASED
✅ Transaction completes within 60 seconds
✅ NFT ownership verified on-chain
✅ Balance updates correctly after mint

### If Failed
❌ Check gas limit set to 8,000,000
❌ Verify NFT_CONTRACT address in constants.ts
❌ Check RPC endpoint health

---

## TEST 2: MARKETPLACE LISTING (CRITICAL)

### Setup
- Navigate to Portfolio
- Select an owned, unlisted NFT
- Click "List for Sale"

### Test Cases
- [ ] **T2.1** - If not approved → Shows "Approve Marketplace" button
- [ ] **T2.2** - Click approve → Wallet prompts for approval
- [ ] **T2.3** - Approval confirms → Button changes to "List NFT"
- [ ] **T2.4** - Enter price (e.g., 100,000 $BASED)
- [ ] **T2.5** - Validation: Price < 1 → Shows error
- [ ] **T2.6** - Validation: Already listed → Shows error
- [ ] **T2.7** - Valid price → Transaction submits
- [ ] **T2.8** - Transaction confirms → NFT appears in Market with "Listed" badge

### Expected Behavior
✅ Two-step process: Approve → List
✅ NFT stays in wallet (doesn't transfer to marketplace)
✅ Listing appears in market within 30 seconds
✅ Price displays correctly

### If Failed
❌ Check MARKETPLACE_CONTRACT address
❌ Verify approval check logic in useMarketplace.ts
❌ Check event logs from marketplace contract

---

## TEST 3: MARKETPLACE PURCHASE (CRITICAL)

### Setup
- Navigate to Market
- Find a listed NFT (not owned by you)
- Verify you have sufficient balance

### Test Cases
- [ ] **T3.1** - Click "Buy Now" → Shows purchase confirmation
- [ ] **T3.2** - Confirm → Wallet prompts for transaction
- [ ] **T3.3** - Verify exact price + platform fee shown
- [ ] **T3.4** - Transaction submits → Shows "Buying..." status
- [ ] **T3.5** - Transaction confirms → NFT removed from market
- [ ] **T3.6** - NFT appears in your Portfolio
- [ ] **T3.7** - Seller's balance increases correctly
- [ ] **T3.8** - Platform fee sent to correct address

### Expected Behavior
✅ Buyer pays exact listed price
✅ Ownership transfers immediately
✅ Listing removed from market
✅ Balances update correctly

### If Failed
❌ Check gas limit (400,000 for buy)
❌ Verify platform fee percentage (1%)
❌ Check royalty distribution

---

## TEST 4: V3 OFFER SYSTEM (CRITICAL)

### Setup
- Navigate to Market or Portfolio
- Select an unlisted NFT (or listed NFT you don't own)
- Click "Make Offer"

### Test Cases
- [ ] **T4.1** - Enter offer amount (e.g., 80,000 $BASED)
- [ ] **T4.2** - Enter optional message (< 280 chars)
- [ ] **T4.3** - Click "Submit Offer" → Wallet prompts for SIGNATURE (NOT transaction)
- [ ] **T4.4** - Sign message → No gas cost
- [ ] **T4.5** - Offer created → Shows in "My Offers" panel
- [ ] **T4.6** - Switch to NFT owner wallet
- [ ] **T4.7** - See pending offer with buyer's message
- [ ] **T4.8** - Click "Accept" → Transaction submits
- [ ] **T4.9** - Switch back to buyer wallet
- [ ] **T4.10** - See "Complete Purchase" button
- [ ] **T4.11** - Click complete → Transaction submits with offer amount
- [ ] **T4.12** - NFT transfers to buyer

### Expected Behavior
✅ Offer creation is FREE (signature only)
✅ Offer stored in localStorage
✅ Seller can accept (pays gas)
✅ Buyer completes (pays price + gas)
✅ NFT transfers correctly

### If Failed
❌ Check EIP-712 signature domain
❌ Verify MARKETPLACE_V3_CONTRACT address
❌ Check localStorage offer storage
❌ Verify nonce tracking

---

## TEST 5: CUSTOM NAME SYSTEM (HIGH PRIORITY)

### Setup
- Navigate to Stats page
- Connect wallet

### Test Cases
- [ ] **T5.1** - If no name set → Shows "Set Name" button
- [ ] **T5.2** - Click → Shows name input modal
- [ ] **T5.3** - Enter 1 character → Shows error "Must be 2+ chars"
- [ ] **T5.4** - Enter 17 characters → Auto-truncated to 16
- [ ] **T5.5** - Enter special chars (!@#$) → Auto-removed
- [ ] **T5.6** - Enter profanity → Shows "inappropriate content" error
- [ ] **T5.7** - Enter valid name "TestUser" → Green checkmark
- [ ] **T5.8** - Click Save → Shows disclaimer popup
- [ ] **T5.9** - Click "I Understand" → Name saves successfully
- [ ] **T5.10** - Name displays as "TestUser#ABC" (with wallet suffix)
- [ ] **T5.11** - Try duplicate name → Shows "already taken"

### Expected Behavior
✅ Real-time availability check
✅ Character validation enforced
✅ Profanity filter works
✅ Disclaimer shown on first save
✅ Name persists across sessions

### If Failed
❌ Run: npm run db:push (create guardian_profiles table)
❌ Check profanityFilter.ts
❌ Verify API endpoint /api/profile/name

---

## TEST 6: GAME (MEDIUM PRIORITY)

### Setup
- Navigate to /game
- Test with and without NFT ownership

### Test Cases
- [ ] **T6.1** - Game loads within 5 seconds
- [ ] **T6.2** - Without NFT → 3 lives, 1x score multiplier
- [ ] **T6.3** - With NFT → 4 lives, 1.5x score multiplier
- [ ] **T6.4** - Controls responsive (arrow keys / touch)
- [ ] **T6.5** - Enemies spawn correctly
- [ ] **T6.6** - Shooting works (bullets fire)
- [ ] **T6.7** - Collision detection works
- [ ] **T6.8** - Game Over → Shows final score
- [ ] **T6.9** - Play Again → Resets properly
- [ ] **T6.10** - Leaderboard updates after game

### Expected Behavior
✅ Smooth 60fps gameplay
✅ NFT holders get perks
✅ Scores saved to database
✅ No memory leaks after multiple plays

### If Failed
❌ Check useGameAccess.ts (NFT gating)
❌ Verify gameEngine.ts loop cleanup
❌ Check game score API endpoint

---

## TEST 7: MULTI-LANGUAGE (MEDIUM PRIORITY)

### Setup
- Open language selector (bottom-right)

### Test Cases
- [ ] **T7.1** - Switch to Spanish → Nav menu translates
- [ ] **T7.2** - Switch to Chinese → UI elements translate
- [ ] **T7.3** - Go to Marketplace → Buttons translated
- [ ] **T7.4** - Go to Stats → Labels translated
- [ ] **T7.5** - No "undefined" or "[object Object]" displayed
- [ ] **T7.6** - Switch back to English → Everything reverts

### Expected Behavior
✅ All visible text translates
✅ No broken keys
✅ Layout doesn't break with longer text
✅ Language persists on refresh

### If Failed
❌ Check locale files (en.json, es.json, etc.)
❌ Verify all t('key') calls
❌ Check i18n initialization

---

## TEST 8: MOBILE RESPONSIVENESS (MEDIUM PRIORITY)

### Setup
- Open app on mobile device OR Chrome DevTools mobile view
- Test with iPhone 12 Pro and Samsung Galaxy S21 sizes

### Test Cases
- [ ] **T8.1** - Homepage loads correctly
- [ ] **T8.2** - Navigation menu accessible (hamburger works)
- [ ] **T8.3** - Marketplace cards responsive
- [ ] **T8.4** - NFT images load and display correctly
- [ ] **T8.5** - Buttons are touch-friendly (min 44px height)
- [ ] **T8.6** - Wallet connect modal appears correctly
- [ ] **T8.7** - Forms are usable (no zoom-in on input focus)
- [ ] **T8.8** - Game playable with touch controls

### Expected Behavior
✅ No horizontal scroll
✅ Touch targets large enough
✅ Text readable without zoom
✅ Wallet connectivity works

### If Failed
❌ Check Tailwind breakpoints (sm:, md:, lg:)
❌ Verify touch-action CSS
❌ Check viewport meta tag

---

## TEST 9: ERROR HANDLING (HIGH PRIORITY)

### Setup
- Simulate error conditions

### Test Cases
- [ ] **T9.1** - Disconnect wallet mid-transaction → Shows error, doesn't crash
- [ ] **T9.2** - Insufficient balance → Clear error message
- [ ] **T9.3** - Network timeout → Retry option shown
- [ ] **T9.4** - Invalid input → Validation message displays
- [ ] **T9.5** - Browser console → No uncaught errors
- [ ] **T9.6** - Switch networks → Banner prompts to switch back
- [ ] **T9.7** - Reject transaction → Returns to previous state

### Expected Behavior
✅ No app crashes
✅ Clear error messages
✅ Graceful degradation
✅ User can recover from errors

### If Failed
❌ Check ErrorBoundary wrappers
❌ Verify error handling in hooks
❌ Check parseContractError utility

---

## TEST 10: PERFORMANCE & MEMORY (HIGH PRIORITY)

### Setup
- Open Chrome DevTools → Performance tab
- Open browser console

### Test Cases
- [ ] **T10.1** - Run: `timers()` → Active timers < 20
- [ ] **T10.2** - Run: `memReport()` → Memory < 200MB
- [ ] **T10.3** - Navigate between pages 10 times → Memory stable
- [ ] **T10.4** - Play game 3 times → No memory spike
- [ ] **T10.5** - Leave app open 5 minutes → No memory leak
- [ ] **T10.6** - Check console → No repeated error logs
- [ ] **T10.7** - Check network tab → No failed requests looping

### Expected Behavior
✅ Memory usage stable over time
✅ Timer count stays low
✅ No infinite loops or leaks
✅ Efficient resource usage

### If Failed
❌ Check useInterval cleanup
❌ Verify useEffect return functions
❌ Check event listener cleanup

---

## FINAL SIGN-OFF

### Pre-Deploy Checklist
- [ ] All 10 test suites passed
- [ ] No console errors during testing
- [ ] Core integrity verified: `npm run core:verify`
- [ ] Database verified: `npm run db:verify`
- [ ] Backups created: `npm run core:backup`
- [ ] Build succeeds: `npm run build`
- [ ] Production build tested locally

### Tester Information
- **Date**: _______________
- **Tester Name**: _______________
- **Environment**: Dev / Staging / Production
- **Browser**: _______________
- **OS**: _______________

### Notes
_Any issues, warnings, or observations:_

───────────────────────────────────────────────

**APPROVAL**
- [ ] I certify all tests have passed
- [ ] I approve deployment to production

Signature: _______________ Date: _______________
