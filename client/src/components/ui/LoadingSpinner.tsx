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
    sm: { container: "w-6 h-6", bar: "h-1" },
    md: { container: "w-12 h-12", bar: "h-1.5" }, 
    lg: { container: "w-16 h-16", bar: "h-2" }
  };

  return (
    <div className={cn("flex flex-col items-center justify-center py-8", className)} data-testid="loading-spinner">
      <div className={cn("relative", sizeClasses[size].container)}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full relative">
            <div className="absolute inset-0 border border-cyan-500/30 rotate-45" />
            <div className="absolute inset-1 border border-cyan-400/50 rotate-45" />
            <div className="absolute inset-2 bg-cyan-500/20 rotate-45 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
            </div>
          </div>
        </div>
        <div className="absolute -inset-1 border border-cyan-500/20 rotate-45 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      {text && (
        <p className="text-cyan-400 font-orbitron text-xs mt-4 tracking-widest uppercase opacity-80">{text}</p>
      )}
    </div>
  );
}

export function GuardianLoader({ 
  text,
  className 
}: { 
  text?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)} data-testid="guardian-loader">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="guardian-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffff" stopOpacity="1" />
              <stop offset="100%" stopColor="#0080ff" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <polygon 
            points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" 
            fill="none" 
            stroke="url(#guardian-gradient)" 
            strokeWidth="2"
            className="opacity-30"
          />
          <polygon 
            points="50,15 85,32.5 85,67.5 50,85 15,67.5 15,32.5" 
            fill="none" 
            stroke="url(#guardian-gradient)" 
            strokeWidth="1.5"
            className="opacity-50 animate-pulse"
          />
          <polygon 
            points="50,25 75,37.5 75,62.5 50,75 25,62.5 25,37.5" 
            fill="rgba(0,255,255,0.1)" 
            stroke="url(#guardian-gradient)" 
            strokeWidth="1"
            className="animate-pulse"
            style={{ animationDuration: '1.5s' }}
          />
          <circle 
            cx="50" 
            cy="50" 
            r="8" 
            fill="none" 
            stroke="#00ffff" 
            strokeWidth="2"
            strokeDasharray="50"
            className="origin-center"
            style={{ 
              animation: 'guardian-orbit 2s linear infinite',
            }}
          />
          <circle cx="50" cy="50" r="3" fill="#00ffff" className="animate-ping" style={{ animationDuration: '1.5s' }} />
        </svg>
      </div>
      {text && (
        <p className="text-cyan-400 font-orbitron text-sm mt-4 tracking-wider uppercase">{text}</p>
      )}
      <style>{`
        @keyframes guardian-orbit {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -100; }
        }
      `}</style>
    </div>
  );
}

export function DataStreamLoader({
  text = "Syncing data...",
  className
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8", className)} data-testid="data-stream-loader">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div 
            key={i}
            className="w-1 bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-full"
            style={{
              height: '24px',
              animation: 'data-bar 0.8s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      {text && (
        <p className="text-cyan-400 font-orbitron text-xs mt-3 tracking-widest uppercase opacity-80">{text}</p>
      )}
      <style>{`
        @keyframes data-bar {
          0%, 100% { transform: scaleY(0.3); opacity: 0.5; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
