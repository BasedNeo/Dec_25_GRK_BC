export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.05)_0%,transparent_60%)]" />
      <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="text-center p-8 relative z-10 max-w-md">
        <div className="mb-6">
          <div className="text-8xl font-orbitron font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-400 bg-clip-text text-transparent animate-pulse">
            404
          </div>
          <div className="font-orbitron text-xs tracking-[0.3em] text-cyan-500/60 mt-2">// SECTOR NOT FOUND</div>
        </div>
        
        <h1 className="text-2xl md:text-3xl font-orbitron font-bold mb-4 text-white">
          LOST IN THE VOID
        </h1>
        
        <p className="text-gray-400 mb-2 font-mono text-sm">
          This dimension doesn't exist... yet.
        </p>
        <p className="text-gray-500 mb-8 font-mono text-xs">
          The coordinates you entered lead to uncharted space.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a 
            href="/"
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black rounded-lg font-orbitron font-bold text-sm hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all duration-300 flex items-center justify-center gap-2"
            data-testid="button-404-home"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            RETURN TO BASE
          </a>
          <button 
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-transparent border border-purple-500/50 text-purple-400 rounded-lg font-orbitron font-bold text-sm hover:bg-purple-500/10 transition-all duration-300"
            data-testid="button-404-back"
          >
            GO BACK
          </button>
        </div>
        
        <div className="mt-12 text-gray-600 text-[10px] font-mono space-y-1">
          <p>Based Guardians Command Center</p>
          <p className="text-cyan-500/40">Protecting the Based Universe since 2024</p>
        </div>
      </div>
    </div>
  );
}
