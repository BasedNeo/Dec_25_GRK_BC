type ConfettiFn = (options?: {
  particleCount?: number;
  angle?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  gravity?: number;
  drift?: number;
  ticks?: number;
  origin?: { x?: number; y?: number };
  colors?: string[];
  shapes?: string[];
  scalar?: number;
  zIndex?: number;
  disableForReducedMotion?: boolean;
}) => Promise<undefined> | null;

let confettiFn: ConfettiFn | null = null;

export async function triggerConfetti(options?: Parameters<ConfettiFn>[0]) {
  if (!confettiFn) {
    const module = await import('canvas-confetti');
    confettiFn = module.default as ConfettiFn;
  }
  return confettiFn(options);
}

export async function getConfetti(): Promise<ConfettiFn> {
  if (!confettiFn) {
    const module = await import('canvas-confetti');
    confettiFn = module.default as ConfettiFn;
  }
  return confettiFn;
}

let FuseConstructor: any = null;

export async function getFuse<T>(): Promise<new (list: T[], options?: any) => { search: (query: string) => Array<{ item: T; score?: number }> }> {
  if (!FuseConstructor) {
    const module = await import('fuse.js');
    FuseConstructor = module.default;
  }
  return FuseConstructor;
}
