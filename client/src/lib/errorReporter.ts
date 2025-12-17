interface ErrorReport {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  feature?: string;
  userAgent: string;
  url: string;
}

class ErrorReporter {
  private maxLogs = 20;

  report(error: Error, context?: { feature?: string; metadata?: Record<string, unknown> }) {
    const report: ErrorReport = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      feature: context?.feature,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    if (import.meta.env.DEV) {
      console.error('[ErrorReporter]', report, context?.metadata);
    }

    this.storeLocal(report);

    if (import.meta.env.PROD) {
      this.sendToService(report, context?.metadata);
    }

    return report.id;
  }

  private storeLocal(report: ErrorReport) {
    try {
      const logs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      logs.push(report);
      
      if (logs.length > this.maxLogs) {
        logs.splice(0, logs.length - this.maxLogs);
      }
      
      localStorage.setItem('error_logs', JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to store error log:', e);
    }
  }

  private sendToService(_report: ErrorReport, _metadata?: Record<string, unknown>) {
    // TODO: Integrate with Sentry, LogRocket, etc.
  }

  getLogs(): ErrorReport[] {
    try {
      return JSON.parse(localStorage.getItem('error_logs') || '[]');
    } catch {
      return [];
    }
  }

  clearLogs() {
    localStorage.removeItem('error_logs');
  }

  exportLogs(): string {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
  }
}

export const errorReporter = new ErrorReporter();

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).errorLogs = () => {
    console.table(errorReporter.getLogs().map(log => ({
      id: log.id.slice(0, 10),
      feature: log.feature || 'Unknown',
      message: log.message.slice(0, 50),
      time: new Date(log.timestamp).toLocaleString()
    })));
  };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).exportErrors = () => {
    const data = errorReporter.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${Date.now()}.json`;
    a.click();
  };
}
