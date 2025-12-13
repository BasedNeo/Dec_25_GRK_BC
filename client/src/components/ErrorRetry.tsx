import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorRetryProps {
  message?: string;
  onRetry: () => void;
  loading?: boolean;
}

export function ErrorRetry({ message = "Failed to load data", onRetry, loading = false }: ErrorRetryProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" data-testid="error-retry">
      <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
      <p className="text-muted-foreground mb-4 font-mono text-sm">{message}</p>
      <Button
        variant="outline"
        onClick={onRetry}
        disabled={loading}
        className="border-primary/50 text-primary hover:bg-primary/10"
        data-testid="button-retry"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Retrying...' : 'Try Again'}
      </Button>
    </div>
  );
}
