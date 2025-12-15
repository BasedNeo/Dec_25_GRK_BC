import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWaitForTransactionReceipt } from 'wagmi';
import { Loader2, CheckCircle2, XCircle, ExternalLink, RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BLOCK_EXPLORER } from '@/lib/constants';
import confetti from 'canvas-confetti';

export interface TransactionState {
  hash?: `0x${string}`;
  type: string;
  description: string;
  status: 'idle' | 'pending' | 'confirming' | 'success' | 'error';
  error?: string;
  retryFn?: () => void;
}

interface TransactionOverlayProps {
  transaction: TransactionState | null;
  onClose: () => void;
}

const AVERAGE_BLOCK_TIME = 3;

export function TransactionOverlay({ transaction, onClose }: TransactionOverlayProps) {
  const [confirmations, setConfirmations] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const { isSuccess, isError, error: receiptError, data: receipt } = useWaitForTransactionReceipt({
    hash: transaction?.hash,
    confirmations: 1,
  });
  
  useEffect(() => {
    if (!transaction || transaction.status === 'idle') return;
    
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [transaction?.hash]);
  
  useEffect(() => {
    if (isSuccess && !showConfetti) {
      setShowConfetti(true);
      triggerConfetti();
    }
  }, [isSuccess, showConfetti]);
  
  useEffect(() => {
    if (receipt?.blockNumber) {
      setConfirmations(1);
    }
  }, [receipt]);
  
  useEffect(() => {
    setElapsedTime(0);
    setConfirmations(0);
    setShowConfetti(false);
  }, [transaction?.hash]);
  
  const triggerConfetti = useCallback(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10001 };
    
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
    
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }
      
      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#00ffff', '#ff00ff', '#00ff00', '#ffff00'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#00ffff', '#ff00ff', '#00ff00', '#ffff00'],
      });
    }, 250);
  }, []);
  
  const copyHash = useCallback(() => {
    if (!transaction?.hash) return;
    navigator.clipboard.writeText(transaction.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [transaction?.hash]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };
  
  const getEstimatedTime = () => {
    const estimatedBlocks = 1;
    const estimatedSeconds = estimatedBlocks * AVERAGE_BLOCK_TIME;
    const remaining = Math.max(0, estimatedSeconds - elapsedTime);
    return remaining > 0 ? `~${remaining}s remaining` : 'Confirming...';
  };
  
  const actualStatus = isSuccess ? 'success' : isError ? 'error' : transaction?.status;
  const actualError = receiptError?.message || transaction?.error;
  
  if (!transaction || transaction.status === 'idle') return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
        data-testid="transaction-overlay"
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={actualStatus === 'success' || actualStatus === 'error' ? onClose : undefined} />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl"
        >
          <div className="text-center">
            <div className="mb-6">
              {actualStatus === 'pending' || actualStatus === 'confirming' ? (
                <div className="relative mx-auto w-20 h-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 border-r-cyan-500/50"
                  />
                  <div className="absolute inset-2 rounded-full bg-cyan-500/10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  </div>
                </div>
              ) : actualStatus === 'success' ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-12 h-12 text-green-400" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="mx-auto w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center"
                >
                  <XCircle className="w-12 h-12 text-red-400" />
                </motion.div>
              )}
            </div>
            
            <h3 className="font-orbitron text-xl mb-2" data-testid="text-tx-title">
              {actualStatus === 'pending' && 'TRANSACTION PENDING'}
              {actualStatus === 'confirming' && 'CONFIRMING...'}
              {actualStatus === 'success' && 'SUCCESS!'}
              {actualStatus === 'error' && 'TRANSACTION FAILED'}
            </h3>
            
            <p className="text-muted-foreground mb-4" data-testid="text-tx-description">
              {transaction.description}
            </p>
            
            {transaction.hash && (
              <div className="bg-black/50 rounded-lg p-3 mb-4">
                <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-sm text-cyan-400 font-mono" data-testid="text-tx-hash">
                    {transaction.hash.slice(0, 10)}...{transaction.hash.slice(-8)}
                  </code>
                  <button 
                    onClick={copyHash} 
                    className="p-1 hover:bg-white/10 rounded"
                    data-testid="button-copy-hash"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <a
                    href={`${BLOCK_EXPLORER}/tx/${transaction.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-white/10 rounded"
                    data-testid="link-explorer"
                  >
                    <ExternalLink className="w-4 h-4 text-cyan-400" />
                  </a>
                </div>
              </div>
            )}
            
            {(actualStatus === 'pending' || actualStatus === 'confirming') && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Elapsed Time</span>
                  <span className="text-white font-mono" data-testid="text-elapsed-time">{formatTime(elapsedTime)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated</span>
                  <span className="text-cyan-400" data-testid="text-estimated-time">{getEstimatedTime()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confirmations</span>
                  <span className="text-white" data-testid="text-confirmations">{confirmations}/1</span>
                </div>
                
                <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: confirmations >= 1 ? '100%' : `${Math.min(elapsedTime * 10, 90)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}
            
            {actualStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-green-400 text-sm mb-4"
                data-testid="text-success-message"
              >
                Transaction confirmed successfully!
              </motion.div>
            )}
            
            {actualStatus === 'error' && (
              <div className="mb-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                  <p className="text-sm text-red-400" data-testid="text-error-message">
                    {actualError || 'Transaction failed. Please try again.'}
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex gap-3 justify-center">
              {actualStatus === 'error' && transaction.retryFn && (
                <Button
                  onClick={() => {
                    onClose();
                    transaction.retryFn?.();
                  }}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 text-black font-bold"
                  data-testid="button-retry"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  RETRY
                </Button>
              )}
              
              {(actualStatus === 'success' || actualStatus === 'error') && (
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="border-white/20"
                  data-testid="button-close-overlay"
                >
                  CLOSE
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function useTransactionOverlay() {
  const [transaction, setTransaction] = useState<TransactionState | null>(null);
  
  const showPending = useCallback((hash: `0x${string}`, type: string, description: string, retryFn?: () => void) => {
    setTransaction({ hash, type, description, status: 'pending', retryFn });
  }, []);
  
  const showError = useCallback((error: string, type: string, description: string, retryFn?: () => void) => {
    setTransaction({ type, description, status: 'error', error, retryFn });
  }, []);
  
  const close = useCallback(() => {
    setTransaction(null);
  }, []);
  
  return { transaction, showPending, showError, close };
}
