export const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
export const isLowEnd = isMobile && typeof window !== 'undefined' && window.devicePixelRatio < 2;

export const mobileSettings = {
  particleIntensity: isLowEnd ? 'low' : 'medium',
  maxParticles: isLowEnd ? 30 : 100,
  starfieldDensity: isLowEnd ? 0.5 : 1,
};

export const haptic = {
  // Generic patterns
  light: () => navigator.vibrate?.(10),
  medium: () => navigator.vibrate?.(25),
  heavy: () => navigator.vibrate?.(50),
  success: () => navigator.vibrate?.([30, 10, 30]),
  error: () => navigator.vibrate?.([50, 30, 50]),
  
  // Space Shooter / Creature Command patterns
  shoot: () => navigator.vibrate?.(10),
  hitEnemy: () => navigator.vibrate?.(20),
  getHit: () => navigator.vibrate?.(100),
  powerUp: () => navigator.vibrate?.([50, 30, 50]),
  gameOver: () => navigator.vibrate?.([100, 50, 100, 50, 200]),
  
  // Ring Alignment patterns
  perfect: () => navigator.vibrate?.(30),
  good: () => navigator.vibrate?.(15),
  miss: () => navigator.vibrate?.([50, 20, 50]),
  levelUp: () => navigator.vibrate?.([30, 30, 30, 30]),
  
  // Cyber Breach patterns
  cardFlip: () => navigator.vibrate?.(10),
  matchFound: () => navigator.vibrate?.([20, 20, 20]),
  noMatch: () => navigator.vibrate?.(50),
  breachComplete: () => navigator.vibrate?.([50, 50, 100]),
  
  // Combo milestones
  comboMilestone: () => navigator.vibrate?.([30, 20, 30, 20, 50]),
};

export const getScaledCoordinates = (
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvasWidth / rect.width;
  const scaleY = canvasHeight / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
};

export const useMobileGameProtection = (gameStarted: boolean) => {
  if (typeof window === 'undefined') return;
  
  let lastTouchEnd = 0;
  let startY = 0;
  
  const preventZoom = (e: TouchEvent) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  };
  
  const preventPullToRefresh = (e: TouchEvent) => {
    if (e.type === 'touchstart') {
      startY = e.touches[0].pageY;
    } else if (e.type === 'touchmove') {
      const currentY = e.touches[0].pageY;
      if (startY < currentY && window.scrollY === 0) {
        e.preventDefault();
      }
    }
  };
  
  if (gameStarted) {
    document.addEventListener('touchend', preventZoom, { passive: false });
    document.addEventListener('touchstart', preventPullToRefresh, { passive: false });
    document.addEventListener('touchmove', preventPullToRefresh, { passive: false });
  }
  
  return () => {
    document.removeEventListener('touchend', preventZoom);
    document.removeEventListener('touchstart', preventPullToRefresh);
    document.removeEventListener('touchmove', preventPullToRefresh);
  };
};
