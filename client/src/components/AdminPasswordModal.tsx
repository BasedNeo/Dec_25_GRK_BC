import { useState, useEffect } from 'react';
import { X, Lock, AlertTriangle, Shield } from 'lucide-react';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  walletAddress: string;
}

export function AdminPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  walletAddress
}: AdminPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(4);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && walletAddress) {
      checkLockStatus();
      setPassword('');
      setError('');
    }
  }, [isOpen, walletAddress]);

  const checkLockStatus = async () => {
    try {
      const res = await fetch(`/api/admin/auth/status/${walletAddress}`);
      const data = await res.json();
      
      if (data.isLocked) {
        setIsLocked(true);
        setLockedUntil(new Date(data.lockedUntil));
        setError(`Access locked until ${new Date(data.lockedUntil).toLocaleString()}`);
      } else {
        setIsLocked(false);
        setRemainingAttempts(data.remainingAttempts || 4);
      }
    } catch (error) {
      console.error('Error checking lock status:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, password }),
      });

      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('admin_authenticated', 'true');
        sessionStorage.setItem('admin_auth_time', Date.now().toString());
        onSuccess();
        setPassword('');
        setError('');
      } else {
        setError(data.message);
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        if (data.lockedUntil) {
          setIsLocked(true);
          setLockedUntil(new Date(data.lockedUntil));
        }
      }
    } catch (error) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
      setPassword('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" data-testid="admin-password-modal">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-cyan-500/30 rounded-xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="text-cyan-400" size={28} />
            <h2 className="text-2xl font-bold text-white font-orbitron">Admin Access</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
            data-testid="close-admin-modal"
          >
            <X size={24} />
          </button>
        </div>

        {isLocked ? (
          <div className="text-center py-6">
            <AlertTriangle className="mx-auto mb-4 text-red-400" size={48} />
            <p className="text-red-400 mb-2 font-bold text-lg">Access Locked</p>
            <p className="text-gray-300 text-sm mb-4">
              Too many failed authentication attempts.
            </p>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-gray-400 text-xs font-mono">
                Locked until: <br />
                <span className="text-red-400 font-bold">
                  {lockedUntil?.toLocaleString()}
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
              data-testid="close-locked-modal"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <p className="text-gray-300 mb-2 text-sm">
                Enter admin password to access the dashboard.
              </p>
              <p className="text-gray-500 text-xs font-mono">
                Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter 5-digit password"
                maxLength={5}
                className="w-full px-4 py-3 bg-slate-900 border border-cyan-500/30 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-600 focus:outline-none focus:border-cyan-400 transition"
                autoFocus
                disabled={isLoading}
                data-testid="admin-password-input"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm text-center" data-testid="admin-error-message">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-400 mb-6 px-2">
              <div className="flex items-center gap-1">
                <Lock size={12} />
                <span>Attempts: {remainingAttempts}/4</span>
              </div>
              <span className="text-gray-500">30-day lockout after 4 fails</span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition font-medium"
                data-testid="cancel-admin-auth"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !password || password.length !== 5}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-bold shadow-lg shadow-cyan-500/20"
                data-testid="submit-admin-password"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
            </div>

            <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-xs text-amber-400 text-center">
                Warning: After 4 failed attempts, this wallet will be locked out for 30 days.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
