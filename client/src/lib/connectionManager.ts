type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

interface ConnectionState {
  status: ConnectionStatus;
  lastCheck: Date | null;
  retryCount: number;
  error: string | null;
}

class ConnectionManager {
  private static instance: ConnectionManager;
  private state: ConnectionState = {
    status: 'disconnected',
    lastCheck: null,
    retryCount: 0,
    error: null
  };
  private listeners: Set<(state: ConnectionState) => void> = new Set();
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly BASE_TIMEOUT = 5000;
  private readonly CHECK_INTERVAL = 30000;

  private constructor() {}

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  async testConnection(url: string = '/api/health'): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.BASE_TIMEOUT);

    try {
      this.updateState({ status: 'connecting' });
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.updateState({ 
          status: 'connected', 
          lastCheck: new Date(),
          retryCount: 0,
          error: null 
        });
        return true;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      clearTimeout(timeoutId);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isAborted = error instanceof Error && error.name === 'AbortError';
      
      this.updateState({ 
        status: 'error',
        lastCheck: new Date(),
        retryCount: this.state.retryCount + 1,
        error: isAborted ? 'Connection timeout' : errorMessage
      });

      console.warn('[ConnectionManager] Connection test failed:', errorMessage);
      return false;
    }
  }

  async connectWithRetry(url: string = '/api/health'): Promise<boolean> {
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      const backoffTime = Math.min(1000 * Math.pow(2, attempt), 8000);
      
      if (attempt > 0) {
        console.log(`[ConnectionManager] Retry ${attempt}/${this.MAX_RETRIES} in ${backoffTime}ms`);
        await this.sleep(backoffTime);
      }

      const success = await this.testConnection(url);
      if (success) {
        return true;
      }
    }

    this.updateState({ 
      status: 'disconnected',
      error: 'Max retries exceeded'
    });
    
    return false;
  }

  startAutoCheck(interval: number = this.CHECK_INTERVAL): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.testConnection();
    
    this.checkInterval = setInterval(() => {
      this.testConnection();
    }, interval);
  }

  stopAutoCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  subscribe(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): ConnectionState {
    return { ...this.state };
  }

  private updateState(partial: Partial<ConnectionState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(listener => listener(this.state));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const connectionManager = ConnectionManager.getInstance();
export type { ConnectionStatus, ConnectionState };
