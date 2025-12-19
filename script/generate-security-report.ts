#!/usr/bin/env tsx
import { SecurityMonitor } from '../server/lib/securityMonitor';

async function generateSecurityReport() {
  console.log('='.repeat(60));
  console.log('SECURITY MONITORING REPORT');
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  console.log();

  const metrics = SecurityMonitor.getMetrics();
  const events = SecurityMonitor.getEvents({ limit: 100 });
  const score = SecurityMonitor.getSecurityScore();

  console.log('SECURITY SCORE:', score, '/ 100');
  console.log('Grade:', getGrade(score));
  console.log();

  console.log('METRICS SUMMARY');
  console.log('-'.repeat(40));
  console.log(`Total Events: ${metrics.totalEvents}`);
  console.log(`Critical: ${metrics.criticalEvents}`);
  console.log(`High: ${metrics.highEvents}`);
  console.log(`Medium: ${metrics.mediumEvents}`);
  console.log(`Low: ${metrics.lowEvents}`);
  console.log(`Blocked Requests: ${metrics.blockedRequests}`);
  console.log(`Failed Auth Attempts: ${metrics.failedAuth}`);
  console.log(`Active Bans: ${metrics.activeBans}`);
  console.log(`Active Threats: ${metrics.activeThreats}`);
  console.log();

  if (events.length > 0) {
    console.log('RECENT SECURITY EVENTS');
    console.log('-'.repeat(40));
    events.slice(0, 20).forEach((event, i) => {
      console.log(`${i + 1}. [${event.severity.toUpperCase()}] ${event.type}`);
      console.log(`   Time: ${event.timestamp}`);
      console.log(`   Source: ${event.source}`);
      if (event.ipAddress) console.log(`   IP: ${event.ipAddress}`);
      console.log(`   Handled: ${event.handled ? 'Yes' : 'No'}`);
      console.log();
    });
  } else {
    console.log('No security events recorded.');
    console.log();
  }

  console.log('RECOMMENDATIONS');
  console.log('-'.repeat(40));
  if (metrics.criticalEvents > 0) {
    console.log('- CRITICAL: Review and handle all critical security events immediately');
  }
  if (metrics.highEvents > 5) {
    console.log('- HIGH: Multiple high-severity events detected, consider additional security measures');
  }
  if (metrics.failedAuth > 10) {
    console.log('- AUTH: High number of failed authentication attempts, review access patterns');
  }
  if (score < 70) {
    console.log('- SCORE: Security score is below recommended threshold (70)');
  }
  if (metrics.totalEvents === 0) {
    console.log('- No security events recorded. System appears secure or monitoring just started.');
  }

  console.log();
  console.log('='.repeat(60));
  console.log('END OF REPORT');
  console.log('='.repeat(60));
}

function getGrade(score: number): string {
  if (score >= 90) return 'A (Excellent)';
  if (score >= 80) return 'B (Good)';
  if (score >= 70) return 'C (Acceptable)';
  if (score >= 60) return 'D (Poor)';
  return 'F (Critical)';
}

generateSecurityReport().catch(console.error);
