import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePendingTransactions, useWatchTransaction, getTxTypeEmoji, PendingTransaction } from '@/hooks/usePendingTransactions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, ExternalLink, ChevronDown, ChevronUp, X, Trash2 } from 'lucide-react';

export function PendingTxBanner() {
  const { transactions, pendingCount, hasPending, dismissTransaction, clearAll, getExplorerLink } = usePendingTransactions();
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (transactions.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-[9998] max-w-sm w-full">
      <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/5" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-3">
            {hasPending ? <div className="relative"><Loader2 className="w-5 h-5 text-cyan-400 animate-spin" /><span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">{pendingCount}</span></div> : <CheckCircle className="w-5 h-5 text-green-400" />}
            <div><p className="font-orbitron text-sm text-white">{hasPending ? 'PENDING TRANSACTIONS' : 'RECENT TRANSACTIONS'}</p><p className="text-[10px] text-muted-foreground">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</p></div>
          </div>
          <div className="flex items-center gap-2">
            {transactions.length > 0 && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); clearAll(); }} className="h-7 px-2 text-xs text-muted-foreground"><Trash2 className="w-3 h-3 mr-1" />Clear All</Button>}
            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="border-t border-white/10 max-h-64 overflow-y-auto">
                {transactions.map((tx) => <TxRow key={tx.hash} tx={tx} onDismiss={() => dismissTransaction(tx.hash)} explorerLink={getExplorerLink(tx.hash)} />)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function TxRow({ tx, onDismiss, explorerLink }: { tx: PendingTransaction; onDismiss: () => void; explorerLink: string; }) {
  useWatchTransaction(tx.status === 'pending' ? tx.hash : undefined);
  const StatusIcon = { pending: Loader2, confirmed: CheckCircle, failed: XCircle }[tx.status];
  const colors = { pending: 'text-cyan-400 bg-cyan-500/10', confirmed: 'text-green-400 bg-green-500/10', failed: 'text-red-400 bg-red-500/10' };
  
  return (
    <div className="px-4 py-3 border-b border-white/5 hover:bg-white/5 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1">
          <span className="text-lg">{getTxTypeEmoji(tx.type)}</span>
          <div><p className="text-sm text-white truncate">{tx.description}</p><Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 mt-1 ${colors[tx.status]}`}><StatusIcon className={`w-3 h-3 mr-1 ${tx.status === 'pending' ? 'animate-spin' : ''}`} />{tx.status.toUpperCase()}</Badge></div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <a href={explorerLink} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-white/10 rounded"><ExternalLink className="w-3 h-3 text-primary" /></a>
          <button onClick={onDismiss} className="p-1.5 hover:bg-white/10 rounded" title={tx.status === 'pending' ? 'Force dismiss' : 'Dismiss'}><X className="w-3 h-3" /></button>
        </div>
      </div>
    </div>
  );
}
