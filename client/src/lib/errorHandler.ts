import { Security } from './security';

type ToastType = 'success' | 'error' | 'warning' | 'info';

const WALLET_OPERATION_PATTERNS = [
  'disconnect',
  'user rejected',
  'user denied',
  'user cancelled',
  'connection request reset',
  'request reset',
  'already pending',
  'connector not found',
  'no connector',
  'wallet',
  'account',
  'provider',
  'chain',
  'network',
  'switch',
  'connector',
  'eth_accounts',
  'eth_requestAccounts',
  'connector already connected',
  'not activated',
  'no active connector',
  'invalidated',
];

function isWalletOperationError(error: any): boolean {
  const errorStr = (
    String(error?.message || '') + 
    String(error?.reason || '') + 
    String(error?.code || '')
  ).toLowerCase();
  
  return WALLET_OPERATION_PATTERNS.some(pattern => errorStr.includes(pattern));
}

class ErrorHandlerClass {
  private toastContainer: HTMLDivElement | null = null;

  initialize(): void {
    if (typeof document === 'undefined') return;
    
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'error-toast-container';
      this.toastContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(this.toastContainer);
    }
  }

  toast(message: string, type: ToastType = 'info', duration: number = 5000): HTMLDivElement | null {
    this.initialize();
    if (!this.toastContainer) return null;

    const toast = document.createElement('div');
    toast.style.cssText = `
      padding: 14px 20px;
      border-radius: 12px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      font-family: 'Orbitron', sans-serif;
      max-width: 380px;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      pointer-events: auto;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(0,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
    `;

    const colors: Record<ToastType, string> = {
      success: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      error: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      warning: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
      info: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)'
    };

    const icons: Record<ToastType, string> = {
      success: '✓',
      error: '⚠',
      warning: '⚡',
      info: '🛸'
    };

    toast.style.background = colors[type] || colors.info;
    toast.innerHTML = `
      <span style="font-size: 18px;">${icons[type]}</span>
      <span>${Security.escapeHtml(message)}</span>
    `;

    toast.onclick = () => this._removeToast(toast);

    this.toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });

    if (duration > 0) {
      setTimeout(() => this._removeToast(toast), duration);
    }

    return toast;
  }

  private _removeToast(toast: HTMLDivElement): void {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }

  handle(error: any, context: string = ''): string | null {
    if (isWalletOperationError(error)) {
      console.log(`[${context}] Ignoring wallet operation:`, error?.message || error);
      return null;
    }

    console.error(`[${context}]`, error);

    const errorMessages: Record<string, string> = {
      'insufficient funds': 'Insufficient $BASED for this transaction',
      'timeout': 'Request timed out. Please try again.',
      'CALL_EXCEPTION': 'Transaction would fail. Check your inputs.',
      '-32603': 'RPC error. Try refreshing the page.',
      'nonce': 'Transaction conflict. Please wait and try again.',
      'gas': 'Gas estimation failed. The network may be busy.',
      'execution reverted': 'Transaction reverted. Check the contract conditions.',
    };

    let userMessage = 'Something went wrong. Please try again.';
    const errorStr = (error.message?.toLowerCase() || String(error.code || '')).toLowerCase();

    for (const [key, msg] of Object.entries(errorMessages)) {
      if (errorStr.includes(key.toLowerCase())) {
        userMessage = msg;
        break;
      }
    }

    this.toast(userMessage, 'error');
    return userMessage;
  }

  async wrapAsync<T>(fn: () => Promise<T>, context: string = '', showSuccess: boolean = false): Promise<T | null> {
    try {
      const result = await fn();
      if (showSuccess) {
        this.toast('Operation completed successfully', 'success', 3000);
      }
      return result;
    } catch (error) {
      const handled = this.handle(error, context);
      if (!handled) {
        return null;
      }
      return null;
    }
  }

  showLoading(message: string = 'Loading...'): HTMLDivElement | null {
    return this.toast(message, 'info', 0);
  }

  hideLoading(toast: HTMLDivElement | null): void {
    if (toast) {
      this._removeToast(toast);
    }
  }
}

export const ErrorHandler = new ErrorHandlerClass();

if (typeof window !== 'undefined') {
  (window as any).ErrorHandler = ErrorHandler;

  window.addEventListener('unhandledrejection', (event) => {
    if (isWalletOperationError(event.reason)) {
      console.log('[Global] Ignoring wallet operation rejection:', event.reason?.message || event.reason);
      event.preventDefault();
      return;
    }
    
    console.error('Unhandled promise rejection:', event.reason);
    ErrorHandler.handle(event.reason, 'Unhandled');
  });
}
