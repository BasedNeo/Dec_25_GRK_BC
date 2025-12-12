import React from 'react';
import './AnimatedBackground.css';

export function AnimatedBackground() {
  return (
    <div className="animated-bg-container">
      {/* Layer 1: Base Gradient */}
      <div className="abg-base-gradient" />
      
      {/* Layer 2: Grid Pattern */}
      <div className="abg-grid-pattern" />
      
      {/* Layer 4: Glow Orbs */}
      <div className="abg-orb orb-1" />
      <div className="abg-orb orb-2" />
      <div className="abg-orb orb-3" />
      
      {/* Layer 3: Floating Particles */}
      <div className="abg-particles">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className={`abg-particle p-${i % 5}`} style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `-${Math.random() * 20}s`,
            animationDuration: `${20 + Math.random() * 20}s`
          }} />
        ))}
      </div>
      
      {/* Layer 5: Scanline */}
      <div className="abg-scanline" />
      
      {/* Layer 6: Vignette */}
      <div className="abg-vignette" />
    </div>
  );
}
