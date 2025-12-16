import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  text?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ 
  text = "Loading...", 
  className,
  size = "md" 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  };

  return (
    <div className={cn("flex flex-col items-center justify-center py-8", className)} data-testid="loading-spinner">
      <div className={cn(
        "border-2 border-cyan-500 border-t-transparent rounded-full animate-spin",
        sizeClasses[size]
      )} />
      {text && (
        <p className="text-cyan-400 font-mono text-sm mt-2 animate-pulse">{text}</p>
      )}
    </div>
  );
}
