import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from './button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'subtle';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${
        variant === 'subtle' ? '' : 'rounded-xl border border-white/10 bg-black/20'
      }`}
      data-testid="empty-state"
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-xl" />
        <div className="relative p-4 rounded-full bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-white/10">
          <Icon className="w-10 h-10 text-gray-400" />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 max-w-xs mb-6">{description}</p>
      
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="btn-press hover-glow-cyan bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white border-0"
          data-testid="empty-state-action"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
