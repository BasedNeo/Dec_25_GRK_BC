import { Component, ErrorInfo, ReactNode } from 'react';
import { Rocket } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const WALLET_ERROR_PATTERNS = [
  'disconnect',
  'wallet',
  'account',
  'connector',
  'provider',
  'chain',
  'network',
  'switch',
  'user rejected',
  'user denied',
  'user cancelled',
  'request reset',
  'already pending',
  'not activated',
  'no active',
  'invalidated',
  'connection',
  'eth_',
  'wagmi',
  'rainbowkit',
  'metamask',
  'walletconnect',
  'rabby',
  'coinbase',
];

function isWalletError(error: Error | undefined): boolean {
  if (!error) return false;
  
  const errorMessage = (error.message || '').toLowerCase();
  const errorName = (error.name || '').toLowerCase();
  const errorString = String(error).toLowerCase();
  
  return WALLET_ERROR_PATTERNS.some(pattern => 
    errorMessage.includes(pattern) || 
    errorName.includes(pattern) ||
    errorString.includes(pattern)
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    if (isWalletError(error)) {
      console.log('[ErrorBoundary] Ignoring wallet-related error:', error.message);
      return { hasError: false };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isWalletError(error)) {
      console.log('[ErrorBoundary] Wallet operation (not an error):', error.message);
      this.setState({ hasError: false });
      return;
    }
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.08)_0%,transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(191,0,255,0.06)_0%,transparent_40%)]" />
          
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.6 + 0.2,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${Math.random() * 2 + 2}s`
                }}
              />
            ))}
          </div>
          
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
          
          <div className="text-center p-8 relative z-10 max-w-lg">
            <div className="mb-8">
              <div className="text-7xl mb-4">
                <span className="inline-block animate-bounce">🛸</span>
              </div>
              <div className="font-orbitron text-[10px] tracking-[0.4em] text-cyan-400/50 uppercase">
                // transmission interrupted
              </div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-orbitron font-bold mb-6 text-white leading-tight">
              A Small Glitch in the{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
                Galaxy
              </span>
            </h1>
            
            <p className="text-gray-300 mb-2 text-base">
              Even the best starships hit turbulence sometimes.
            </p>
            <p className="text-gray-500 mb-8 text-sm">
              Your assets are safe. Let's get you back on course.
            </p>
            
            <button 
              onClick={() => window.location.reload()}
              className="group px-8 py-4 bg-gradient-to-r from-cyan-500 via-cyan-400 to-purple-500 text-black rounded-xl font-orbitron font-bold text-base hover:shadow-[0_0_40px_rgba(0,255,255,0.5)] transition-all duration-300 flex items-center justify-center gap-3 mx-auto transform hover:scale-105"
              data-testid="button-error-reload"
            >
              <Rocket className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              LAUNCH AGAIN
            </button>
            
            <button 
              onClick={() => window.location.href = '/'}
              className="mt-4 px-6 py-2 text-cyan-400/70 hover:text-cyan-400 font-mono text-xs transition-colors"
              data-testid="button-error-home"
            >
              or return to Command Center →
            </button>
            
            <div className="mt-12 p-4 bg-white/5 border border-cyan-500/20 rounded-lg backdrop-blur-sm">
              <p className="text-cyan-400/50 text-[10px] font-mono mb-1">// Debug transmission:</p>
              <p className="text-cyan-400/60 font-mono text-[10px] break-all">
                {this.state.error?.message || 'Unknown cosmic disturbance'}
              </p>
            </div>
            
            <p className="text-gray-600/50 text-[10px] mt-8 font-orbitron tracking-widest">
              BASED GUARDIANS • PROTECTING THE GALAXY
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
