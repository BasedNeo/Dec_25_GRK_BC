export class Logger {
  private static formatTimestamp(): string {
    return new Date().toISOString();
  }
  
  static info(component: string, message: string, meta?: any) {
    const log = `[${this.formatTimestamp()}] [INFO] [${component}] ${message}`;
    if (meta) {
      console.log(log, JSON.stringify(meta));
    } else {
      console.log(log);
    }
  }
  
  static warn(component: string, message: string, meta?: any) {
    const log = `[${this.formatTimestamp()}] [WARN] [${component}] ${message}`;
    if (meta) {
      console.warn(log, JSON.stringify(meta));
    } else {
      console.warn(log);
    }
  }
  
  static error(component: string, message: string, error?: any) {
    const log = `[${this.formatTimestamp()}] [ERROR] [${component}] ${message}`;
    if (error) {
      console.error(log, error instanceof Error ? error.message : JSON.stringify(error));
    } else {
      console.error(log);
    }
  }
  
  static security(message: string, meta?: any) {
    const log = `[${this.formatTimestamp()}] [SECURITY] ${message}`;
    if (meta) {
      console.error(log, JSON.stringify(meta));
    } else {
      console.error(log);
    }
  }
  
  static debug(component: string, message: string, meta?: any) {
    if (process.env.NODE_ENV === 'development') {
      const log = `[${this.formatTimestamp()}] [DEBUG] [${component}] ${message}`;
      if (meta) {
        console.log(log, JSON.stringify(meta));
      } else {
        console.log(log);
      }
    }
  }
  
  static perf(component: string, action: string, durationMs: number) {
    const level = durationMs > 1000 ? 'WARN' : 'INFO';
    const log = `[${this.formatTimestamp()}] [PERF] [${component}] ${action} completed in ${durationMs}ms`;
    if (level === 'WARN') {
      console.warn(log);
    } else {
      console.log(log);
    }
  }
}
