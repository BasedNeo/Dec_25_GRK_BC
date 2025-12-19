export interface TransactionReceiptData {
  walletAddress: string;
  transactionType: 'mint' | 'buy' | 'sell' | 'list' | 'delist' | 'offer_made' | 'offer_accepted' | 'offer_cancelled' | 'custom_name' | 'vote';
  transactionHash: string;
  amount?: string;
  tokenId?: number;
  fromAddress?: string;
  toAddress?: string;
  platformFee?: string;
  royaltyFee?: string;
  netAmount?: string;
  quantity?: number;
  pricePerUnit?: string;
  gasEstimate?: string;
  metadata?: {
    listingId?: number;
    offerId?: number;
    proposalId?: number;
    customName?: string;
    [key: string]: any;
  };
}

export async function logTransactionReceipt(data: TransactionReceiptData): Promise<void> {
  try {
    const receipt = {
      ...data,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    const response = await fetch('/api/transactions/receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receipt)
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.warn('[RECEIPT] Failed to log:', error.error);
    } else {
      console.log('[RECEIPT] Logged:', data.transactionType, data.transactionHash);
    }
  } catch (error) {
    console.error('[RECEIPT] Failed to log:', error);
  }
}

export async function updateTransactionReceipt(txHash: string, receipt: {
  blockNumber?: number;
  gasUsed?: bigint | string;
  effectiveGasPrice?: bigint | string;
}): Promise<void> {
  try {
    const gasUsed = receipt.gasUsed?.toString();
    const gasPrice = receipt.effectiveGasPrice?.toString();
    
    const gasCostInBase = gasUsed && gasPrice 
      ? (BigInt(gasUsed) * BigInt(gasPrice)).toString()
      : undefined;
    
    const update = {
      status: 'confirmed',
      blockNumber: receipt.blockNumber,
      gasUsed,
      gasPrice,
      gasCostInBase,
      confirmedAt: new Date().toISOString()
    };
    
    await fetch(`/api/transactions/receipt/${txHash}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
    
    console.log('[RECEIPT] Updated:', txHash);
  } catch (error) {
    console.error('[RECEIPT] Failed to update:', error);
  }
}

export async function markTransactionFailed(txHash: string, errorMessage?: string): Promise<void> {
  try {
    await fetch(`/api/transactions/receipt/${txHash}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'failed',
        errorMessage: errorMessage || 'Transaction failed',
        failedAt: new Date().toISOString()
      })
    });
    
    console.log('[RECEIPT] Marked failed:', txHash);
  } catch (error) {
    console.error('[RECEIPT] Failed to mark as failed:', error);
  }
}
