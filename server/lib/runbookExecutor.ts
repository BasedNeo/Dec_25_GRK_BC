interface RunbookStep {
  id: string;
  title: string;
  description: string;
  command?: string;
  automated: boolean;
  critical: boolean;
  estimatedMinutes: number;
  prerequisite?: string[];
  validation?: string;
  rollback?: string;
}

interface Runbook {
  id: string;
  title: string;
  category: 'backup' | 'restore' | 'failover' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  steps: RunbookStep[];
  totalEstimatedTime: number;
  lastExecuted?: Date;
  executionCount: number;
  successRate: number;
}

interface RunbookExecution {
  runbookId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  executedBy: string;
  completedSteps: string[];
  currentStep?: string;
  logs: Array<{
    timestamp: Date;
    level: 'info' | 'warning' | 'error';
    message: string;
  }>;
  error?: string;
}

export class RunbookExecutor {
  private static runbooks: Map<string, Runbook> = new Map();
  private static executions: Map<string, RunbookExecution> = new Map();
  
  static initialize() {
    this.registerRunbook({
      id: 'emergency-db-restore',
      title: 'Emergency Database Restore',
      category: 'restore',
      severity: 'critical',
      description: 'Complete database restoration from latest backup',
      steps: [
        {
          id: 'verify-backup',
          title: 'Verify Latest Backup',
          description: 'Verify the integrity of the most recent backup',
          command: 'npm run db:verify',
          automated: true,
          critical: true,
          estimatedMinutes: 2,
          validation: 'Backup checksum matches'
        },
        {
          id: 'stop-services',
          title: 'Stop All Services',
          description: 'Stop application services to prevent data conflicts',
          automated: true,
          critical: true,
          estimatedMinutes: 1
        },
        {
          id: 'create-pre-restore-backup',
          title: 'Create Pre-Restore Backup',
          description: 'Create emergency backup of current state',
          command: 'npm run db:backup',
          automated: true,
          critical: true,
          estimatedMinutes: 5
        },
        {
          id: 'restore-database',
          title: 'Restore Database',
          description: 'Restore database from verified backup',
          command: 'npm run db:restore',
          automated: true,
          critical: true,
          estimatedMinutes: 10,
          prerequisite: ['verify-backup', 'create-pre-restore-backup'],
          rollback: 'Restore from pre-restore backup'
        },
        {
          id: 'verify-restore',
          title: 'Verify Restoration',
          description: 'Verify database integrity after restore',
          automated: true,
          critical: true,
          estimatedMinutes: 3,
          validation: 'All tables accessible and counts match'
        },
        {
          id: 'restart-services',
          title: 'Restart Services',
          description: 'Restart application services',
          automated: true,
          critical: true,
          estimatedMinutes: 2
        },
        {
          id: 'health-check',
          title: 'Run Health Checks',
          description: 'Verify all systems are operational',
          automated: true,
          critical: true,
          estimatedMinutes: 2,
          validation: 'All health checks pass'
        }
      ],
      totalEstimatedTime: 25,
      executionCount: 0,
      successRate: 100
    });
    
    this.registerRunbook({
      id: 'security-breach-response',
      title: 'Security Breach Response',
      category: 'security',
      severity: 'critical',
      description: 'Immediate response to security compromise',
      steps: [
        {
          id: 'isolate-system',
          title: 'Isolate Compromised System',
          description: 'Disconnect system from network',
          automated: false,
          critical: true,
          estimatedMinutes: 5
        },
        {
          id: 'ban-suspicious-ips',
          title: 'Ban Suspicious IPs',
          description: 'Block all suspicious IP addresses',
          automated: true,
          critical: true,
          estimatedMinutes: 1
        },
        {
          id: 'rotate-keys',
          title: 'Rotate All Keys',
          description: 'Rotate encryption keys, API keys, and credentials',
          automated: false,
          critical: true,
          estimatedMinutes: 30
        },
        {
          id: 'audit-access',
          title: 'Audit Access Logs',
          description: 'Review all access logs for unauthorized activity',
          automated: true,
          critical: true,
          estimatedMinutes: 15
        },
        {
          id: 'verify-backups',
          title: 'Verify Backup Integrity',
          description: 'Ensure backups are not compromised',
          command: 'npm run db:verify',
          automated: true,
          critical: true,
          estimatedMinutes: 5
        },
        {
          id: 'notify-users',
          title: 'Notify Users',
          description: 'Send security incident notification',
          automated: false,
          critical: true,
          estimatedMinutes: 10
        }
      ],
      totalEstimatedTime: 66,
      executionCount: 0,
      successRate: 100
    });
    
    this.registerRunbook({
      id: 'performance-degradation',
      title: 'Performance Degradation Response',
      category: 'performance',
      severity: 'high',
      description: 'Diagnose and resolve performance issues',
      steps: [
        {
          id: 'check-resources',
          title: 'Check System Resources',
          description: 'Verify CPU, memory, and disk usage',
          automated: true,
          critical: false,
          estimatedMinutes: 1
        },
        {
          id: 'check-database',
          title: 'Check Database Performance',
          description: 'Identify slow queries and bottlenecks',
          automated: true,
          critical: false,
          estimatedMinutes: 5
        },
        {
          id: 'clear-caches',
          title: 'Clear Caches',
          description: 'Clear application and database caches',
          automated: true,
          critical: false,
          estimatedMinutes: 1
        },
        {
          id: 'restart-services',
          title: 'Restart Services',
          description: 'Restart application services if needed',
          automated: true,
          critical: false,
          estimatedMinutes: 2
        },
        {
          id: 'monitor-improvement',
          title: 'Monitor Improvement',
          description: 'Verify performance has improved',
          automated: true,
          critical: false,
          estimatedMinutes: 5
        }
      ],
      totalEstimatedTime: 14,
      executionCount: 0,
      successRate: 100
    });
    
    console.log(`[RUNBOOK] Initialized ${this.runbooks.size} runbooks`);
  }
  
  static registerRunbook(runbook: Runbook): void {
    this.runbooks.set(runbook.id, runbook);
  }
  
  static async executeRunbook(runbookId: string, executedBy: string, automated: boolean = false): Promise<RunbookExecution> {
    const runbook = this.runbooks.get(runbookId);
    
    if (!runbook) {
      throw new Error(`Runbook not found: ${runbookId}`);
    }
    
    const executionId = `exec-${Date.now()}`;
    
    const execution: RunbookExecution = {
      runbookId,
      startTime: new Date(),
      status: 'running',
      executedBy,
      completedSteps: [],
      logs: []
    };
    
    this.executions.set(executionId, execution);
    
    this.log(execution, 'info', `Starting runbook: ${runbook.title}`);
    this.log(execution, 'info', `Estimated time: ${runbook.totalEstimatedTime} minutes`);
    
    try {
      for (const step of runbook.steps) {
        if (!automated && !step.automated) {
          this.log(execution, 'warning', `Manual step required: ${step.title}`);
          continue;
        }
        
        if (step.prerequisite) {
          const prerequisitesMet = step.prerequisite.every(prereq => 
            execution.completedSteps.includes(prereq)
          );
          
          if (!prerequisitesMet) {
            this.log(execution, 'error', `Prerequisites not met for: ${step.title}`);
            throw new Error(`Prerequisites not met for step: ${step.id}`);
          }
        }
        
        execution.currentStep = step.id;
        this.log(execution, 'info', `Executing: ${step.title}`);
        
        const stepStartTime = Date.now();
        
        try {
          await this.executeStep(step, execution);
          
          const duration = Date.now() - stepStartTime;
          this.log(execution, 'info', `Completed: ${step.title} (${duration}ms)`);
          
          execution.completedSteps.push(step.id);
        } catch (error: any) {
          this.log(execution, 'error', `Failed: ${step.title} - ${error.message}`);
          
          if (step.critical) {
            throw error;
          }
          
          this.log(execution, 'warning', 'Non-critical step failed, continuing...');
        }
      }
      
      execution.status = 'completed';
      execution.endTime = new Date();
      
      const duration = execution.endTime.getTime() - execution.startTime.getTime();
      this.log(execution, 'info', `Runbook completed in ${Math.ceil(duration / 1000 / 60)} minutes`);
      
      runbook.executionCount++;
      runbook.lastExecuted = new Date();
      
    } catch (error: any) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error.message;
      
      this.log(execution, 'error', `Runbook failed: ${error.message}`);
      
      const successCount = runbook.executionCount - Math.floor((100 - runbook.successRate) / 100 * runbook.executionCount);
      runbook.successRate = (successCount / (runbook.executionCount + 1)) * 100;
    }
    
    return execution;
  }
  
  private static async executeStep(step: RunbookStep, execution: RunbookExecution): Promise<void> {
    if (step.command) {
      this.log(execution, 'info', `Running command: ${step.command}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (step.validation) {
      this.log(execution, 'info', `Validating: ${step.validation}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  private static log(execution: RunbookExecution, level: 'info' | 'warning' | 'error', message: string): void {
    execution.logs.push({
      timestamp: new Date(),
      level,
      message
    });
    
    const prefix = `[RUNBOOK:${execution.runbookId}]`;
    
    switch (level) {
      case 'info':
        console.log(`${prefix} ${message}`);
        break;
      case 'warning':
        console.warn(`${prefix} ${message}`);
        break;
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
    }
  }
  
  static getRunbook(id: string): Runbook | undefined {
    return this.runbooks.get(id);
  }
  
  static getAllRunbooks(): Runbook[] {
    return Array.from(this.runbooks.values());
  }
  
  static getExecution(id: string): RunbookExecution | undefined {
    return this.executions.get(id);
  }
  
  static getExecutionHistory(runbookId?: string): RunbookExecution[] {
    const executions = Array.from(this.executions.values());
    
    if (runbookId) {
      return executions.filter(e => e.runbookId === runbookId);
    }
    
    return executions;
  }
}

RunbookExecutor.initialize();
