import { db } from '../db';
import { sql } from 'drizzle-orm';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: any;
  error?: string;
}

export class HealthCheckService {
  static async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      await db.execute(sql`SELECT 1`);
      
      const responseTime = Date.now() - start;
      
      return {
        service: 'database',
        status: responseTime < 100 ? 'healthy' : 'degraded',
        responseTime,
        details: { latency: `${responseTime}ms` }
      };
    } catch (error: any) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  }
  
  static async checkBackupSystem(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      const { DatabaseBackupService } = await import('../../script/backup-database');
      const service = new DatabaseBackupService();
      const stats = await service.getBackupStats();
      
      const lastBackupAge = stats.newest ? Date.now() - new Date(stats.newest).getTime() : Infinity;
      const hoursOld = lastBackupAge / (1000 * 60 * 60);
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (hoursOld > 48) status = 'unhealthy';
      else if (hoursOld > 24) status = 'degraded';
      
      return {
        service: 'backup_system',
        status,
        responseTime: Date.now() - start,
        details: {
          total: stats.total,
          lastBackup: stats.newest,
          hoursOld: hoursOld === Infinity ? 'No backups' : hoursOld.toFixed(1)
        }
      };
    } catch (error: any) {
      return {
        service: 'backup_system',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  }
  
  static async checkDiskSpace(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      const { execSync } = require('child_process');
      const output = execSync('df -h / | tail -1').toString();
      const parts = output.split(/\s+/);
      const used = parts[4];
      const usedPercent = parseInt(used);
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (usedPercent > 90) status = 'unhealthy';
      else if (usedPercent > 80) status = 'degraded';
      
      return {
        service: 'disk_space',
        status,
        responseTime: Date.now() - start,
        details: { used: used }
      };
    } catch (error: any) {
      return {
        service: 'disk_space',
        status: 'degraded',
        responseTime: Date.now() - start,
        error: 'Could not check disk space'
      };
    }
  }
  
  static async checkMemory(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const percent = (heapUsedMB / heapTotalMB) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (percent > 90) status = 'unhealthy';
      else if (percent > 80) status = 'degraded';
      
      return {
        service: 'memory',
        status,
        responseTime: Date.now() - start,
        details: {
          heapUsed: `${heapUsedMB.toFixed(2)} MB`,
          heapTotal: `${heapTotalMB.toFixed(2)} MB`,
          percent: `${percent.toFixed(1)}%`
        }
      };
    } catch (error: any) {
      return {
        service: 'memory',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  }
  
  static async runAllChecks(): Promise<HealthCheckResult[]> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkBackupSystem(),
      this.checkDiskSpace(),
      this.checkMemory()
    ]);
    
    return checks;
  }
  
  static async getSystemHealth(): Promise<{ healthy: boolean; checks: HealthCheckResult[]; score: number }> {
    const checks = await this.runAllChecks();
    
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;
    
    const score = 100 - (unhealthyCount * 30) - (degradedCount * 15);
    const healthy = score >= 70;
    
    return { healthy, checks, score };
  }
}
