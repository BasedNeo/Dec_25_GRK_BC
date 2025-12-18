import { useState, useEffect, useCallback } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { BLOCK_EXPLORER } from '@/lib/constants';

const STORAGE_KEY = 'basedguardians_pending_txs';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type TxType = 'mint' | 'buy' | 'list' | 'delist' | 'offer' | 'vote' | 'proposal' | 'approve' | 'other';

export interface PendingTransaction {
  hash: `0x${string}`;
  type: TxType;
  description: string;
  timestamp: number;
  tokenId?: number;
  amount?: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export function savePendingTx(hash: `0x${string}`, type: TxType, description: string, extra?: { tokenId?: number; amount?: string }): void {
  try {
    const existing = getPendingTxs();
    if (existing.some(tx => tx.hash === hash)) return;
    existing.push({ hash, type, description, timestamp: Date.now(), tokenId: extra?.tokenId, amount: extra?.amount, status: 'pending' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent('pending-tx-added'));
  } catch (e) {}
}

export function getPendingTxs(): PendingTransaction[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const txs: PendingTransaction[] = JSON.parse(stored);
    return txs.filter(tx => Date.now() - tx.timestamp < MAX_AGE_MS);
  } catch (e) { return []; }
}

export function updateTxStatus(hash: string, status: 'confirmed' | 'failed'): void {
  try {
    const txs = getPendingTxs();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txs.map(tx => tx.hash === hash ? { ...tx, status } : tx)));
    window.dispatchEvent(new CustomEvent('pending-tx-updated'));
  } catch (e) {}
}

export function removePendingTx(hash: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getPendingTxs().filter(tx => tx.hash !== hash)));
  } catch (e) {}
}

export function clearCompletedTxs(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getPendingTxs().filter(tx => tx.status === 'pending')));
  } catch (e) {}
}

export function clearAllTxs(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch (e) {}
}

interface PendingTransactionsResult {
  transactions: PendingTransaction[];
  pendingTxs: PendingTransaction[];
  pendingCount: number;
  hasPending: boolean;
  addTransaction: (hash: `0x${string}`, type: TxType, description: string, extra?: { tokenId?: number; amount?: string }) => void;
  dismissTransaction: (hash: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  getExplorerLink: (hash: string) => string;
}

export function usePendingTransactions(): PendingTransactionsResult {
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  
  useEffect(() => {
    setTransactions(getPendingTxs());
    const refresh = () => setTransactions(getPendingTxs());
    window.addEventListener('pending-tx-added', refresh);
    window.addEventListener('pending-tx-updated', refresh);
    return () => { window.removeEventListener('pending-tx-added', refresh); window.removeEventListener('pending-tx-updated', refresh); };
  }, []);
  
  const pendingTxs = transactions.filter(tx => tx.status === 'pending');
  
  return {
    transactions, pendingTxs,
    pendingCount: pendingTxs.length,
    hasPending: pendingTxs.length > 0,
    addTransaction: useCallback((hash: `0x${string}`, type: TxType, description: string, extra?: { tokenId?: number; amount?: string }) => { savePendingTx(hash, type, description, extra); setTransactions(getPendingTxs()); }, []),
    dismissTransaction: useCallback((hash: string) => { removePendingTx(hash); setTransactions(getPendingTxs()); }, []),
    clearCompleted: useCallback(() => { clearCompletedTxs(); setTransactions(getPendingTxs()); }, []),
    clearAll: useCallback(() => { clearAllTxs(); setTransactions([]); }, []),
    getExplorerLink: (hash: string) => `${BLOCK_EXPLORER}/tx/${hash}`,
  };
}

export function useWatchTransaction(hash: `0x${string}` | undefined): void {
  const { isSuccess, isError } = useWaitForTransactionReceipt({ hash });
  useEffect(() => {
    if (!hash) return;
    if (isSuccess) updateTxStatus(hash, 'confirmed');
    else if (isError) updateTxStatus(hash, 'failed');
  }, [hash, isSuccess, isError]);
}

export function getTxTypeEmoji(type: TxType): string {
  return { mint: '🎨', buy: '🛒', list: '📋', delist: '❌', offer: '🏷️', vote: '🗳️', proposal: '📜', approve: '✅', other: '📝' }[type];
}
