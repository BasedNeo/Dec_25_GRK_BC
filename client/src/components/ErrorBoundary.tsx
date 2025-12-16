import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorMessage = error?.message?.toLowerCase() || '';
    const isWalletError = 
      errorMessage.includes('disconnect') ||
      errorMessage.includes('wallet') ||
      errorMessage.includes('account') ||
      errorMessage.includes('connector') ||
      errorMessage.includes('provider');
    
    if (isWalletError) {
      return { hasError: false };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorMessage = error?.message?.toLowerCase() || '';
    const isWalletError = 
      errorMessage.includes('disconnect') ||
      errorMessage.includes('wallet') ||
      errorMessage.includes('account') ||
      errorMessage.includes('connector') ||
      errorMessage.includes('provider');
    
    if (isWalletError) {
      console.log('[ErrorBoundary] Ignoring wallet-related error:', error.message);
      this.setState({ hasError: false });
      return;
    }
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(191,0,255,0.08)_0%,transparent_60%)]" />
          <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          
          <div className="text-center p-8 relative z-10 max-w-md">
            <div className="mb-6">
              <div className="text-6xl mb-4 animate-pulse">⚠️</div>
              <div className="font-orbitron text-xs tracking-[0.3em] text-red-500/60 mb-2">// SYSTEM MALFUNCTION</div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-orbitron font-bold mb-4 bg-gradient-to-r from-red-500 via-orange-400 to-red-500 bg-clip-text text-transparent">
              GUARDIAN DOWN
            </h1>
            
            <p className="text-gray-400 mb-2 font-mono text-sm">
              The simulation encountered an anomaly.
            </p>
            <p className="text-gray-500 mb-6 font-mono text-xs">
              Don't worry, your NFTs are safe on-chain.
            </p>
            
            <div className="bg-black/50 border border-red-500/20 rounded-lg p-4 mb-6 text-left">
              <p className="text-red-400/80 font-mono text-[10px] break-all">
                ERROR: {this.state.error?.message || 'Unknown quantum disturbance'}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black rounded-lg font-orbitron font-bold text-sm hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all duration-300 flex items-center justify-center gap-2"
                data-testid="button-error-reload"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                REBOOT SYSTEM
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-transparent border border-cyan-500/50 text-cyan-400 rounded-lg font-orbitron font-bold text-sm hover:bg-cyan-500/10 transition-all duration-300"
                data-testid="button-error-home"
              >
                RETURN TO BASE
              </button>
            </div>
            
            <p className="text-gray-600 text-[10px] mt-8 font-mono">
              Based Guardians Command Center v1.0
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
