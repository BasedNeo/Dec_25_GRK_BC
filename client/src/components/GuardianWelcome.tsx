import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Edit3, Check, AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { containsProfanity, getProfanityError } from '@/lib/profanityFilter';

interface WelcomeBackToastProps {
  message: string;
  displayName: string | null;
  onDismiss: () => void;
}

export function WelcomeBackModal({ message, displayName, onDismiss }: WelcomeBackToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);
    
    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, 3200);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%] pointer-events-none"
        >
          <div className="bg-gradient-to-r from-gray-900/95 via-purple-900/90 to-gray-900/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl px-6 py-4 shadow-[0_0_40px_rgba(0,255,255,0.15)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 animate-pulse" />
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-cyan-400 to-purple-500 animate-[shrink_3s_linear_forwards]" style={{ width: '100%' }} />
            
            <div className="relative flex items-center gap-4">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Sparkles className="w-8 h-8 text-cyan-400" />
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <p className="text-white font-orbitron text-sm truncate">
                  {displayName ? `Hey ${displayName.split('#')[0]}` : 'Welcome back'}
                </p>
                <p className="text-gray-300/90 text-sm leading-snug mt-0.5">
                  {message}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface NamePromptModalProps {
  walletSuffix: string;
  onSubmit: (name: string | null) => Promise<{ success: boolean; error?: string }>;
  onCheckAvailable: (name: string) => Promise<{ available: boolean; error?: string }>;
  onDismiss: () => void;
}

export function NamePromptModal({ walletSuffix, onSubmit, onCheckAvailable, onDismiss }: NamePromptModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [checkTimeout, setCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleNameChange = (value: string) => {
    const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
    setName(cleaned);
    setError(null);
    setIsAvailable(null);
    
    if (checkTimeout) {
      clearTimeout(checkTimeout);
    }
    
    if (cleaned.length >= 2) {
      if (containsProfanity(cleaned)) {
        setError(getProfanityError());
        setIsAvailable(false);
        return;
      }
      
      setChecking(true);
      const timeout = setTimeout(async () => {
        const result = await onCheckAvailable(cleaned);
        setIsAvailable(result.available);
        if (!result.available && result.error) {
          setError(result.error);
        }
        setChecking(false);
      }, 300);
      setCheckTimeout(timeout);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.length >= 2 && isAvailable && !checking) {
      e.preventDefault();
      setShowConfirmation(true);
    }
  };

  const handleSubmitClick = () => {
    if (name.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    
    if (containsProfanity(name)) {
      setError(getProfanityError());
      return;
    }
    
    if (!isAvailable) {
      setError('This name is already taken');
      return;
    }
    
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmation(false);
    setSubmitting(true);
    const result = await onSubmit(name);
    setSubmitting(false);
    
    if (result.success) {
      onDismiss();
    } else {
      setError(result.error || 'Failed to set name');
    }
  };

  const handleSkip = () => {
    onDismiss();
  };

  if (showConfirmation) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="max-w-md w-full"
          >
            <Card className="bg-gradient-to-br from-gray-900 via-gray-900 to-amber-900/20 border-amber-500/30 p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5" />
              
              <div className="relative">
                <div className="text-center mb-6">
                  <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                  <h2 className="text-xl font-orbitron font-bold text-white mb-2">
                    Confirm Your Guardian Name
                  </h2>
                  <div className="text-2xl font-orbitron text-white mb-4">
                    {name}<span className="text-cyan-400">#{walletSuffix}</span>
                  </div>
                  <p className="text-amber-200/80 text-sm leading-relaxed">
                    This name may be displayed publicly on social media, 
                    leaderboards, and community communications. 
                    Please ensure you're comfortable with this name being visible to others.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 border-gray-600 text-gray-400 hover:text-white"
                    data-testid="button-cancel-confirm"
                  >
                    Go Back
                  </Button>
                  <Button
                    onClick={handleConfirmSubmit}
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-orbitron"
                    data-testid="button-confirm-name"
                  >
                    {submitting ? 'Saving...' : 'Confirm Name'}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="max-w-lg w-full"
        >
          <Card className="bg-gradient-to-br from-gray-900 via-gray-900 to-cyan-900/20 border-purple-500/30 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5" />
            
            <div className="relative">
              <div className="text-center mb-6">
                <Edit3 className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                <h2 className="text-xl font-orbitron font-bold text-white mb-2">
                  Choose Your Guardian Name
                </h2>
                <p className="text-gray-400 text-sm">
                  Your wallet suffix <span className="text-cyan-400 font-mono">#{walletSuffix}</span> will be added to make it unique.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter name (2-16 characters)"
                    className="bg-gray-800/50 border-gray-700 text-white pr-10"
                    maxLength={16}
                    data-testid="input-custom-name"
                  />
                  {name.length >= 2 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checking ? (
                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      ) : isAvailable ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : isAvailable === false ? (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      ) : null}
                    </div>
                  )}
                </div>
                
                {name.length >= 2 && isAvailable && (
                  <div className="text-center">
                    <span className="text-sm text-gray-400">Preview: </span>
                    <span className="text-lg font-orbitron text-white">
                      {name}<span className="text-cyan-400">#{walletSuffix}</span>
                    </span>
                  </div>
                )}
                
                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}
                
                {isAvailable === false && !error && (
                  <p className="text-red-400 text-sm text-center">This name is already taken</p>
                )}
                
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="flex-1 border-gray-600 text-gray-400 hover:text-white"
                    data-testid="button-skip-name"
                  >
                    Skip for Now
                  </Button>
                  <Button
                    onClick={handleSubmitClick}
                    disabled={name.length < 2 || !isAvailable || submitting || checking}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-orbitron disabled:opacity-50"
                    data-testid="button-save-name"
                  >
                    {submitting ? 'Saving...' : 'Save Name'}
                  </Button>
                </div>
                
                <p className="text-xs text-gray-500 text-center">
                  You can change this later in your Stats page
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
