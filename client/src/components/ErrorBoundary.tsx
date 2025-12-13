import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="p-6 bg-red-950/20 border-red-500/30 flex flex-col items-center justify-center text-center space-y-4 backdrop-blur-sm">
          <div className="bg-red-500/10 p-3 rounded-full">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-orbitron text-red-400 mb-2">Something went wrong</h3>
            <p className="text-sm text-red-200/60 max-w-xs mx-auto mb-4">
              We couldn't load this section. It might be a network issue.
            </p>
          </div>
          {this.props.onRetry && (
            <Button 
              variant="outline" 
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onRetry?.();
              }}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
        </Card>
      );
    }

    return this.props.children;
  }
}
