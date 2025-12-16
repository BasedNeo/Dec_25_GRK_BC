import { Rocket, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(191,0,255,0.08)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(0,255,255,0.06)_0%,transparent_40%)]" />
      
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(60)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 2 + 2}s`
            }}
          />
        ))}
      </div>
      
      <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
      
      <div className="text-center p-8 relative z-10 max-w-lg">
        <div className="mb-6">
          <div className="text-8xl md:text-9xl font-orbitron font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
            404
          </div>
          <div className="font-orbitron text-[10px] tracking-[0.4em] text-purple-400/50 uppercase mt-2">
            // uncharted territory
          </div>
        </div>
        
        <h1 className="text-2xl md:text-3xl font-orbitron font-bold mb-4 text-white">
          Lost in{' '}
          <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Deep Space
          </span>
        </h1>
        
        <p className="text-gray-300 mb-2 text-base">
          Houston, we have a problem...
        </p>
        <p className="text-gray-500 mb-8 text-sm">
          This sector of the galaxy hasn't been discovered yet.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="/"
            className="group px-8 py-4 bg-gradient-to-r from-cyan-500 via-cyan-400 to-purple-500 text-black rounded-xl font-orbitron font-bold text-sm hover:shadow-[0_0_40px_rgba(0,255,255,0.5)] transition-all duration-300 flex items-center justify-center gap-3 transform hover:scale-105"
            data-testid="button-404-home"
          >
            <Rocket className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            BACK TO BASE
          </a>
          <button 
            onClick={() => window.history.back()}
            className="px-6 py-4 bg-transparent border border-purple-500/40 text-purple-400 rounded-xl font-orbitron font-bold text-sm hover:bg-purple-500/10 hover:border-purple-400 transition-all duration-300 flex items-center justify-center gap-2"
            data-testid="button-404-back"
          >
            <Compass className="w-4 h-4" />
            GO BACK
          </button>
        </div>
        
        <div className="mt-12 flex items-center justify-center gap-2 text-gray-600/50">
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          <span className="text-[10px] font-mono">Based Guardians Command Center</span>
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        </div>
      </div>
    </div>
  );
}
