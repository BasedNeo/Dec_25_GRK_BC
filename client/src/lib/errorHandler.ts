import { showToast } from './customToast';

export const ErrorHandler = {
  handle(error: unknown, context: string = ''): string {
    console.error(`[${context}]`, error);

    let userMessage = 'An unexpected error occurred';

    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      
      if (msg.includes('network') || msg.includes('fetch')) {
        userMessage = 'Network connection failed. Please check your internet.';
      } else if (msg.includes('user rejected') || msg.includes('rejected')) {
        userMessage = 'Transaction cancelled';
      } else if (msg.includes('insufficient funds')) {
        userMessage = 'Insufficient funds for this transaction';
      } else if (msg.includes('timeout')) {
        userMessage = 'Request timed out. Please try again.';
      } else if (error.message.length < 100) {
        userMessage = error.message;
      }
    }

    if ((error as any)?.code === 4001) {
      userMessage = 'Transaction rejected by user';
    } else if ((error as any)?.code === -32002) {
      userMessage = 'Please check your wallet - a request is pending';
    }

    showToast(userMessage, 'error');
    return userMessage;
  },

  async wrapAsync<T>(fn: () => Promise<T>, context: string = ''): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.handle(error, context);
      return null;
    }
  }
};

export function sanitizeHtml(str: string | undefined | null): string {
  if (!str) return '';
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

export function validateImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('https://') || url.startsWith('ipfs://')) {
    return url;
  }
  return '';
}

export function validateMetadata(metadata: any): {
  name: string;
  description: string;
  image: string;
  attributes: Array<{ trait_type: string; value: string }>;
} | null {
  if (!metadata || typeof metadata !== 'object') return null;

  return {
    name: sanitizeHtml(metadata.name || ''),
    description: sanitizeHtml(metadata.description || ''),
    image: validateImageUrl(metadata.image),
    attributes: Array.isArray(metadata.attributes)
      ? metadata.attributes.map((a: any) => ({
          trait_type: sanitizeHtml(a.trait_type || ''),
          value: sanitizeHtml(String(a.value || ''))
        }))
      : []
  };
}

const rateLimitMap = new Map<string, number>();

export function canCallWithRateLimit(key: string, limitMs: number = 1000): boolean {
  const now = Date.now();
  const lastCall = rateLimitMap.get(key) || 0;

  if (now - lastCall < limitMs) {
    return false;
  }

  rateLimitMap.set(key, now);
  return true;
}
