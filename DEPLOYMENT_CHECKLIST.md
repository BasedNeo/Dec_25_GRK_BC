# Pre-Deployment Checklist

Run these checks BEFORE every deployment to production.

## 1. Core Integrity Check
```bash
npx tsx script/backup-core.ts verify
```
- Expected: All protected files pass integrity check
- If failed: Review changes, restore from backup if needed

## 2. Database Verification
```bash
npx tsx script/backup-core.ts verify
npm run db:push
```
- Expected: All tables exist and accessible
- If failed: Run `npm run db:push` to apply migrations

## 3. Security Tests
```bash
# Test rate limiting (should see 429 after 100 requests)
curl -X GET http://localhost:5000/api/health
```

## 4. Commerce Function Tests

### Mint Test
- [ ] Connect wallet
- [ ] Go to Mint page
- [ ] Mint 1 NFT successfully
- [ ] Verify NFT appears in Portfolio

### Marketplace Test
- [ ] List owned NFT for sale
- [ ] Verify listing appears in Market
- [ ] (Optional) Buy from different wallet
- [ ] Verify ownership transfer

### Offer Test (V3)
- [ ] Make gasless offer (EIP-712 signature)
- [ ] Verify offer stored in localStorage
- [ ] Seller accepts offer
- [ ] Buyer completes purchase
- [ ] Verify NFT transfer

### Profile Test
- [ ] Set custom name
- [ ] Verify profanity filter blocks bad names
- [ ] Verify duplicate names blocked
- [ ] Name displays correctly in Stats

## 5. Performance Check
```javascript
// Open browser console
memReport()
timers()
```
- Memory usage < 200MB after 5 minutes
- Active timers < 20
- No memory leaks detected

## 6. Translation Check
- [ ] Switch to 3 different languages
- [ ] Verify nav menu translates
- [ ] Verify marketplace translates
- [ ] No missing translation keys

## 7. Mobile Check
- [ ] Test on mobile device
- [ ] Wallet connect works
- [ ] Touch controls responsive
- [ ] Game playable (if applicable)

## 8. Final Backup
```bash
npx tsx script/backup-core.ts backup
```
- All protected files backed up before deployment

## 9. Build Production
```bash
npm run build
```
- Build completes without errors
- No TypeScript errors
- No linter errors

## 10. Deploy
Only after ALL checks pass:
```bash
npm run start
```

---

## Quick Commands Reference

```bash
# Verify all protected files
npx tsx script/backup-core.ts verify

# Create backups of all protected files
npx tsx script/backup-core.ts backup

# Restore a file from backup
npx tsx script/backup-core.ts restore <file-path>

# List all backups for a file
npx tsx script/backup-core.ts list <file-path>
```
