# DEPLOYMENT CHECKLIST

## Pre-Deployment (DO FIRST)

- [ ] Run `npm run deployment:check` - ALL CHECKS MUST PASS
- [ ] Review all environment variables in `.env.production`
- [ ] Verify ENCRYPTION_KEY is 32+ characters and UNIQUE
- [ ] Verify ADMIN_ADDRESSES contains correct wallet addresses
- [ ] Verify all contract addresses are correct for production network
- [ ] Run `npm run test:financial` - ensure all tests pass
- [ ] Run `npm run test:encryption` - ensure all tests pass
- [ ] Run `npm run security:report` - review security posture

## Database Preparation

- [ ] Create production database
- [ ] Run `npm run db:push` to create tables
- [ ] Verify database connection with `npm run db:verify`
- [ ] Create initial backup: `npm run db:backup`
- [ ] Test backup restoration on staging environment
- [ ] Set up automated daily backups (cron job)

## Security Hardening

- [ ] Rotate all keys and secrets
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure firewall rules
- [ ] Set up fail2ban or equivalent
- [ ] Enable DDoS protection (Cloudflare, etc.)
- [ ] Review CORS allowed origins
- [ ] Verify rate limiting is active
- [ ] Test authentication flows
- [ ] Verify session management is secure

## Application Build

- [ ] Run `npm run build` successfully
- [ ] Test production build locally
- [ ] Verify all static assets load
- [ ] Check bundle size (should be optimized)
- [ ] Verify no console.log in production code
- [ ] Check for any exposed API keys or secrets

## Deployment

- [ ] Deploy to production server
- [ ] Verify application starts without errors
- [ ] Check all environment variables are loaded
- [ ] Verify database connection is established
- [ ] Run `npm run dr:test` - disaster recovery test

## Post-Deployment Verification (CRITICAL)

- [ ] Health check passes: `curl https://yourdomain.com/api/health/complete`
- [ ] Admin dashboard accessible
- [ ] Can connect wallet successfully
- [ ] Can view NFT collection
- [ ] Can mint NFT (test with small amount)
- [ ] Marketplace loads correctly
- [ ] Governance system works
- [ ] Game functionality operational
- [ ] Price feeds updating
- [ ] Activity feed showing data
- [ ] Backups running on schedule

## Monitoring Setup

- [ ] Verify monitoring dashboard shows data
- [ ] Set up alerts for critical errors
- [ ] Set up uptime monitoring (UptimeRobot, etc.)
- [ ] Configure error reporting (Sentry, etc.)
- [ ] Set up log aggregation
- [ ] Monitor resource usage (CPU, memory, disk)
- [ ] Test alert notifications

## Emergency Procedures

- [ ] Document rollback procedure
- [ ] Test emergency backup restoration
- [ ] Verify disaster recovery runbooks are accessible
- [ ] Set up on-call rotation
- [ ] Document emergency contacts
- [ ] Create incident response plan

## Final Verification

- [ ] Monitor application for 1 hour
- [ ] Check error logs for any issues
- [ ] Verify all critical functions work
- [ ] Confirm backups are being created
- [ ] Test from multiple devices/browsers
- [ ] Verify mobile experience

## Go-Live Communication

- [ ] Announce maintenance window to users
- [ ] Update status page
- [ ] Monitor community channels
- [ ] Prepare rollback plan
- [ ] Have team on standby

---

## ROLLBACK PROCEDURE

If critical issues are discovered:

1. **STOP** - Do not make changes in panic
2. Access Admin Dashboard
3. Navigate to "Database Backup & Restore"
4. Select pre-deployment backup
5. Click "Restore" and confirm
6. Verify restoration successful
7. Communicate status to users
8. Investigate issue in staging
9. Fix and re-deploy when ready

---

## POST-DEPLOYMENT MONITORING

Monitor for 24 hours:
- [ ] Hour 1: Active monitoring (team on call)
- [ ] Hour 4: Check all metrics
- [ ] Hour 12: Verify backups completed
- [ ] Hour 24: Full system review
- [ ] Day 7: Post-deployment review meeting
