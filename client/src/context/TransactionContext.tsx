import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { TransactionOverlay, TransactionState } from '@/components/TransactionOverlay';
import { savePendingTx, updateTxStatus, TxType } from '@/hooks/usePendingTransactions';

interface TransactionContextType {
  showTransaction: (hash: `0x${string}`, type: TxType, description: string, retryFn?: () => void) => void;
  showError: (error: string, type: TxType, description: string, retryFn?: () => void) => void;
  closeOverlay: () => void;
  isVisible: boolean;
}

const TransactionContext = createContext<TransactionContextType | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transaction, setTransaction] = useState<TransactionState | null>(null);
  
  const showTransaction = useCallback((hash: `0x${string}`, type: TxType, description: string, retryFn?: () => void) => {
    savePendingTx(hash, type, description);
    setTransaction({ hash, type, description, status: 'pending', retryFn });
  }, []);
  
  const showError = useCallback((error: string, type: TxType, description: string, retryFn?: () => void) => {
    setTransaction({ type, description, status: 'error', error, retryFn });
  }, []);
  
  const closeOverlay = useCallback(() => {
    if (transaction?.hash) {
      const overlay = document.querySelector('[data-testid="transaction-overlay"]');
      const isSuccess = overlay?.querySelector('[data-testid="text-success-message"]');
      if (isSuccess) {
        updateTxStatus(transaction.hash, 'confirmed');
      }
    }
    setTransaction(null);
  }, [transaction?.hash]);
  
  return (
    <TransactionContext.Provider value={{ showTransaction, showError, closeOverlay, isVisible: !!transaction }}>
      {children}
      <TransactionOverlay transaction={transaction} onClose={closeOverlay} />
    </TransactionContext.Provider>
  );
}

export function useTransactionContext() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactionContext must be used within TransactionProvider');
  }
  return context;
}
