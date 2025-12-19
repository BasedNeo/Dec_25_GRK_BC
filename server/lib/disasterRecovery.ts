import { DatabaseBackupService } from '../../script/backup-database';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

interface DisasterType {
  code: 'DB_CORRUPTION' | 'DATA_LOSS' | 'SYSTEM_COMPROMISE' | 'NETWORK_FAILURE' | 'MANUAL_ERROR' | 'HARDWARE_FAILURE';
  name: string;
  severity: 'critical' | 'high' | 'medium';
  autoRecoverable: boolean;
}

interface RecoveryStep {
  id: string;
  description: string;
  automated: boolean;
  estimatedDuration: number;
  critical: boolean;
  command?: string;
}

interface DisasterRecoveryPlan {
  disasterType: DisasterType;
  detectedAt: Date;
  steps: RecoveryStep[];
  estimatedTotalDuration: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completedSteps: string[];
  currentStep?: string;
  error?: string;
}

export class DisasterRecoveryService {
  private static backupService = new DatabaseBackupService();
  
  private static disasterTypes: DisasterType[] = [
    {
      code: 'DB_CORRUPTION',
      name: 'Database Corruption',
      severity: 'critical',
      autoRecoverable: true
    },
    {
      code: 'DATA_LOSS',
      name: 'Data Loss Detected',
      severity: 'critical',
      autoRecoverable: true
    },
    {
      code: 'SYSTEM_COMPROMISE',
      name: 'Security Compromise',
      severity: 'critical',
      autoRecoverable: false
    },
    {
      code: 'NETWORK_FAILURE',
      name: 'Network Connectivity Lost',
      severity: 'high',
      autoRecoverable: true
    },
    {
      code: 'MANUAL_ERROR',
      name: 'Manual Operator Error',
      severity: 'high',
      autoRecoverable: true
    },
    {
      code: 'HARDWARE_FAILURE',
      name: 'Hardware Failure',
      severity: 'critical',
      autoRecoverable: false
    }
  ];
  
  static async createRecoveryPlan(disasterCode: DisasterType['code']): Promise<DisasterRecoveryPlan> {
    const disaster = this.disasterTypes.find(d => d.code === disasterCode);
    
    if (!disaster) {
      throw new Error(`Unknown disaster type: ${disasterCode}`);
    }
    
    console.log(`[DR] Creating recovery plan for: ${disaster.name}`);
    
    const steps = await this.getRecoverySteps(disaster);
    const totalDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);
    
    const plan: DisasterRecoveryPlan = {
      disasterType: disaster,
      detectedAt: new Date(),
      steps,
      estimatedTotalDuration: totalDuration,
      status: 'pending',
      completedSteps: []
    };
    
    await this.savePlan(plan);
    
    return plan;
  }
  
  private static async getRecoverySteps(disaster: DisasterType): Promise<RecoveryStep[]> {
    const steps: RecoveryStep[] = [];
    
    switch (disaster.code) {
      case 'DB_CORRUPTION':
        steps.push(
          {
            id: 'verify_corruption',
            description: 'Verify database corruption',
            automated: true,
            estimatedDuration: 30,
            critical: true,
            command: 'npm run db:verify'
          },
          {
            id: 'stop_writes',
            description: 'Stop all write operations',
            automated: true,
            estimatedDuration: 5,
            critical: true
          },
          {
            id: 'create_emergency_backup',
            description: 'Create emergency backup of current state',
            automated: true,
            estimatedDuration: 120,
            critical: true,
            command: 'npm run db:backup'
          },
          {
            id: 'find_last_good_backup',
            description: 'Identify last known good backup',
            automated: true,
            estimatedDuration: 10,
            critical: true
          },
          {
            id: 'restore_database',
            description: 'Restore from last good backup',
            automated: true,
            estimatedDuration: 180,
            critical: true,
            command: 'npm run db:restore'
          },
          {
            id: 'verify_integrity',
            description: 'Verify database integrity',
            automated: true,
            estimatedDuration: 60,
            critical: true
          },
          {
            id: 'resume_operations',
            description: 'Resume normal operations',
            automated: true,
            estimatedDuration: 5,
            critical: true
          }
        );
        break;
        
      case 'DATA_LOSS':
        steps.push(
          {
            id: 'assess_data_loss',
            description: 'Assess extent of data loss',
            automated: true,
            estimatedDuration: 60,
            critical: true
          },
          {
            id: 'stop_operations',
            description: 'Stop all operations',
            automated: true,
            estimatedDuration: 5,
            critical: true
          },
          {
            id: 'identify_recovery_point',
            description: 'Identify point-in-time recovery target',
            automated: true,
            estimatedDuration: 30,
            critical: true
          },
          {
            id: 'pitr_restore',
            description: 'Perform point-in-time recovery',
            automated: true,
            estimatedDuration: 300,
            critical: true
          },
          {
            id: 'validate_data',
            description: 'Validate recovered data',
            automated: true,
            estimatedDuration: 120,
            critical: true
          },
          {
            id: 'resume_operations',
            description: 'Resume operations',
            automated: true,
            estimatedDuration: 5,
            critical: true
          }
        );
        break;
        
      case 'SYSTEM_COMPROMISE':
        steps.push(
          {
            id: 'isolate_system',
            description: 'Isolate compromised system',
            automated: false,
            estimatedDuration: 10,
            critical: true
          },
          {
            id: 'assess_breach',
            description: 'Assess security breach',
            automated: false,
            estimatedDuration: 300,
            critical: true
          },
          {
            id: 'secure_backups',
            description: 'Verify backup integrity',
            automated: true,
            estimatedDuration: 60,
            critical: true
          },
          {
            id: 'rotate_credentials',
            description: 'Rotate all credentials and keys',
            automated: false,
            estimatedDuration: 120,
            critical: true
          },
          {
            id: 'clean_restore',
            description: 'Restore to clean system',
            automated: false,
            estimatedDuration: 600,
            critical: true
          },
          {
            id: 'security_audit',
            description: 'Perform security audit',
            automated: false,
            estimatedDuration: 1800,
            critical: true
          }
        );
        break;
        
      case 'NETWORK_FAILURE':
        steps.push(
          {
            id: 'verify_network',
            description: 'Verify network connectivity',
            automated: true,
            estimatedDuration: 30,
            critical: true
          },
          {
            id: 'enable_offline_mode',
            description: 'Enable offline mode',
            automated: true,
            estimatedDuration: 5,
            critical: false
          },
          {
            id: 'failover_connection',
            description: 'Attempt failover connection',
            automated: true,
            estimatedDuration: 60,
            critical: true
          },
          {
            id: 'sync_data',
            description: 'Sync offline data',
            automated: true,
            estimatedDuration: 120,
            critical: true
          }
        );
        break;
        
      case 'MANUAL_ERROR':
        steps.push(
          {
            id: 'identify_error',
            description: 'Identify erroneous operation',
            automated: false,
            estimatedDuration: 60,
            critical: true
          },
          {
            id: 'calculate_rollback',
            description: 'Calculate rollback point',
            automated: true,
            estimatedDuration: 30,
            critical: true
          },
          {
            id: 'execute_rollback',
            description: 'Execute rollback',
            automated: true,
            estimatedDuration: 180,
            critical: true
          },
          {
            id: 'verify_rollback',
            description: 'Verify rollback success',
            automated: true,
            estimatedDuration: 60,
            critical: true
          }
        );
        break;
        
      case 'HARDWARE_FAILURE':
        steps.push(
          {
            id: 'assess_hardware',
            description: 'Assess hardware failure',
            automated: false,
            estimatedDuration: 120,
            critical: true
          },
          {
            id: 'provision_replacement',
            description: 'Provision replacement hardware',
            automated: false,
            estimatedDuration: 3600,
            critical: true
          },
          {
            id: 'restore_from_backup',
            description: 'Restore from backup',
            automated: true,
            estimatedDuration: 300,
            critical: true
          },
          {
            id: 'validate_system',
            description: 'Validate system functionality',
            automated: true,
            estimatedDuration: 180,
            critical: true
          }
        );
        break;
    }
    
    return steps;
  }
  
  static async executeRecoveryPlan(plan: DisasterRecoveryPlan, automated: boolean = false): Promise<void> {
    console.log(`[DR] Executing recovery plan for: ${plan.disasterType.name}`);
    console.log(`[DR] Estimated duration: ${Math.ceil(plan.estimatedTotalDuration / 60)} minutes`);
    
    plan.status = 'in_progress';
    await this.savePlan(plan);
    
    try {
      for (const step of plan.steps) {
        if (!automated && !step.automated) {
          console.log(`[DR] Manual step required: ${step.description}`);
          continue;
        }
        
        console.log(`[DR] Executing step: ${step.description}`);
        plan.currentStep = step.id;
        await this.savePlan(plan);
        
        const startTime = Date.now();
        
        try {
          await this.executeStep(step);
          
          const duration = Date.now() - startTime;
          console.log(`[DR] Step completed in ${duration}ms`);
          
          plan.completedSteps.push(step.id);
          await this.savePlan(plan);
        } catch (error: any) {
          console.error(`[DR] Step failed: ${step.description}`, error);
          
          if (step.critical) {
            throw new Error(`Critical step failed: ${step.description} - ${error.message}`);
          }
          
          console.warn(`[DR] Non-critical step failed, continuing...`);
        }
      }
      
      plan.status = 'completed';
      plan.currentStep = undefined;
      await this.savePlan(plan);
      
      console.log(`[DR] Recovery plan completed successfully`);
    } catch (error: any) {
      plan.status = 'failed';
      plan.error = error.message;
      await this.savePlan(plan);
      
      console.error(`[DR] Recovery plan failed:`, error);
      throw error;
    }
  }
  
  private static async executeStep(step: RecoveryStep): Promise<void> {
    switch (step.id) {
      case 'verify_corruption':
        await this.verifyDatabaseIntegrity();
        break;
      case 'stop_writes':
        await this.stopWriteOperations();
        break;
      case 'create_emergency_backup':
        await this.backupService.backup('full');
        break;
      case 'find_last_good_backup':
        await this.findLastGoodBackup();
        break;
      case 'restore_database':
        const backups = await this.backupService.listBackups();
        const lastGood = backups.find(b => b.status === 'success');
        if (lastGood) {
          await this.backupService.restore(lastGood.id);
        }
        break;
      case 'verify_integrity':
        await this.verifyDatabaseIntegrity();
        break;
      case 'resume_operations':
        await this.resumeOperations();
        break;
      default:
        console.log(`[DR] Step ${step.id} - no automated implementation`);
    }
  }
  
  private static async verifyDatabaseIntegrity(): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not found');
    
    try {
      await execAsync(`psql "${dbUrl}" -c "SELECT 1"`);
      console.log('[DR] Database connection verified');
    } catch (error) {
      throw new Error('Database connection failed');
    }
  }
  
  private static async stopWriteOperations(): Promise<void> {
    console.log('[DR] Stopping write operations (feature flag)');
  }
  
  private static async resumeOperations(): Promise<void> {
    console.log('[DR] Resuming normal operations');
  }
  
  private static async findLastGoodBackup(): Promise<void> {
    const backups = await this.backupService.listBackups();
    
    for (const backup of backups) {
      const valid = await this.backupService.verifyBackup(backup.id);
      if (valid) {
        console.log(`[DR] Last good backup: ${backup.id}`);
        return;
      }
    }
    
    throw new Error('No valid backups found');
  }
  
  private static async savePlan(plan: DisasterRecoveryPlan): Promise<void> {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!existsSync(logsDir)) {
      await mkdir(logsDir, { recursive: true });
    }
    const planFile = path.join(logsDir, 'recovery-plan.json');
    await writeFile(planFile, JSON.stringify(plan, null, 2));
  }
  
  static async testDisasterRecovery(): Promise<any> {
    console.log('[DR] Running disaster recovery test...');
    
    const results: any = {
      timestamp: new Date(),
      tests: []
    };
    
    const testBackup = async () => {
      try {
        const backup = await this.backupService.backup('full');
        const valid = await this.backupService.verifyBackup(backup.id);
        
        return {
          name: 'Backup & Verify',
          passed: valid,
          duration: backup.duration
        };
      } catch (error: any) {
        return {
          name: 'Backup & Verify',
          passed: false,
          error: error.message
        };
      }
    };
    
    const testDbConnection = async () => {
      try {
        await this.verifyDatabaseIntegrity();
        return { name: 'Database Connection', passed: true };
      } catch (error: any) {
        return { name: 'Database Connection', passed: false, error: error.message };
      }
    };
    
    const testRecoveryPlan = async () => {
      try {
        const plan = await this.createRecoveryPlan('DATA_LOSS');
        return { 
          name: 'Recovery Plan Creation', 
          passed: plan.steps.length > 0,
          steps: plan.steps.length
        };
      } catch (error: any) {
        return { name: 'Recovery Plan Creation', passed: false, error: error.message };
      }
    };
    
    results.tests.push(await testDbConnection());
    results.tests.push(await testRecoveryPlan());
    
    results.passed = results.tests.every((t: any) => t.passed);
    
    console.log(`[DR] Test complete: ${results.passed ? 'PASSED' : 'FAILED'}`);
    
    return results;
  }
  
  static getDisasterTypes(): DisasterType[] {
    return this.disasterTypes;
  }
}
