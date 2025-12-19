interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  }
): Promise<T> {
  let lastError: Error | null = null;
  let delay = options.initialDelay;
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === options.maxAttempts) {
        break;
      }
      
      console.log(`[RETRY] Attempt ${attempt} failed, retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * options.backoffMultiplier, options.maxDelay);
    }
  }
  
  throw lastError || new Error('Retry failed');
}
