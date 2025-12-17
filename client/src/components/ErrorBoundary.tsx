import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  isolate?: boolean;
  resetKeys?: unknown[];
  feature?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
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

function isWalletError(error: Error | null): boolean {
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

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    if (isWalletError(error)) {
      return { hasError: false };
    }
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (isWalletError(error)) {
      this.setState({ hasError: false });
      return;
    }

    const { onError, feature } = this.props;
    const { errorId } = this.state;

    console.error(`[ErrorBoundary${feature ? ` - ${feature}` : ''}]`, {
      errorId,
      error,
      errorInfo,
      timestamp: new Date().toISOString()
    });

    this.setState({ errorInfo });

    if (onError) {
      onError(error, errorInfo);
    }

    if (import.meta.env.PROD) {
      this.reportError(error, errorInfo, errorId || '');
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && resetKeys && prevProps.resetKeys) {
      if (resetKeys.some((key, i) => key !== prevProps.resetKeys![i])) {
        this.resetError();
      }
    }
  }

  reportError(error: Error, errorInfo: React.ErrorInfo, errorId: string) {
    try {
      const errorLog = {
        id: errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: Date.now(),
        feature: this.props.feature,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      const logs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      logs.push(errorLog);
      
      if (logs.length > 20) logs.shift();
      
      localStorage.setItem('error_logs', JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  copyErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;
    const details = `
Error ID: ${errorId}
Feature: ${this.props.feature || 'Unknown'}
Message: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
URL: ${window.location.href}
Time: ${new Date().toISOString()}
    `.trim();

    navigator.clipboard.writeText(details);
  };

  render() {
    const { hasError, error, errorId } = this.state;
    const { children, fallback, isolate, feature } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      if (isolate) {
        return (
          <div className="p-4 border border-red-500/30 bg-red-500/10 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertTriangle size={16} />
              <span className="text-sm font-mono">
                {feature ? `${feature} Error` : 'Component Error'}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={this.resetError}
              className="text-xs"
              data-testid="button-retry-isolated"
            >
              <RefreshCw size={12} className="mr-1" />
              Retry
            </Button>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.1)_0%,transparent_50%)]" />
          
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
          
          <Card className="relative z-10 max-w-2xl w-full bg-black/95 border-red-500/30 backdrop-blur-xl p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              
              <h1 className="text-2xl font-orbitron font-bold text-white mb-2">
                Houston, We Have a Problem
              </h1>
              
              <p className="text-gray-400">
                Something went wrong while loading this component.
                {feature && ` (Feature: ${feature})`}
              </p>
            </div>

            <div className="bg-black/50 border border-red-500/20 rounded-lg p-4 mb-6">
              <div className="text-xs font-mono text-red-300 mb-2">
                Error ID: {errorId}
              </div>
              <div className="text-sm text-gray-300 mb-2 font-mono">
                {error?.message || 'Unknown error'}
              </div>
              {import.meta.env.DEV && (
                <details className="text-xs text-gray-500 mt-2">
                  <summary className="cursor-pointer hover:text-gray-400">
                    Stack Trace (Dev Only)
                  </summary>
                  <pre className="mt-2 p-2 bg-black/50 rounded overflow-x-auto text-[10px]">
                    {error?.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={this.resetError}
                className="flex-1 bg-cyan-500 text-black hover:bg-cyan-400"
                data-testid="button-error-retry"
              >
                <RefreshCw className="mr-2" size={16} />
                Try Again
              </Button>
              
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
                data-testid="button-error-home"
              >
                <Home className="mr-2" size={16} />
                Go Home
              </Button>
              
              <Button
                onClick={this.copyErrorDetails}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
                data-testid="button-error-copy"
              >
                <Bug className="mr-2" size={16} />
                Copy Error
              </Button>
            </div>

            <p className="text-center text-xs text-gray-500 mt-6">
              If this problem persists, please contact support with Error ID: {errorId}
            </p>
          </Card>
        </div>
      );
    }

    return children;
  }
}

export { ErrorBoundary };
