export interface TransactionReceiptData {
  walletAddress: string;
  transactionType: 'mint' | 'buy' | 'sell' | 'list' | 'delist' | 'offer' | 'accept_offer' | 'cancel_offer' | 'transfer';
  transactionHash: string;
  tokenId?: number;
  amount?: string;
  fromAddress?: string;
  toAddress?: string;
  platformFee?: string;
  royaltyFee?: string;
  metadata?: string;
}

export async function logTransactionReceipt(data: TransactionReceiptData): Promise<void> {
  try {
    const response = await fetch('/api/transactions/receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, status: 'pending' })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.warn('[RECEIPT] Failed to log:', error.error);
    }
  } catch (error) {
    console.error('[RECEIPT] Failed to log:', error);
  }
}

export async function updateTransactionReceipt(txHash: string, receipt: {
  blockNumber?: number;
  gasUsed?: bigint | string;
  gasPrice?: bigint | string;
}): Promise<void> {
  try {
    await fetch(`/api/transactions/receipt/${txHash}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'confirmed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        gasPrice: receipt.gasPrice?.toString(),
      })
    });
  } catch (error) {
    console.error('[RECEIPT] Failed to update:', error);
  }
}

export async function markTransactionFailed(txHash: string): Promise<void> {
  try {
    await fetch(`/api/transactions/receipt/${txHash}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'failed' })
    });
  } catch (error) {
    console.error('[RECEIPT] Failed to mark as failed:', error);
  }
}
