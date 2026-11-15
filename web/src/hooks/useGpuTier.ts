import { useState, useEffect } from 'react';
import { getGPUTier } from 'detect-gpu';

export interface GpuTierState {
  tier: number;
  isMobile: boolean;
  fps: number;
  type: string;
  loading: boolean;
}

export function useGpuTier(overrideTier?: number): GpuTierState {
  const [state, setState] = useState<GpuTierState>({
    tier: overrideTier !== undefined ? overrideTier : 2,
    isMobile: false,
    fps: 60,
    type: 'BENCHMARK',
    loading: overrideTier === undefined,
  });

  useEffect(() => {
    if (overrideTier !== undefined) {
      setState({
        tier: overrideTier,
        isMobile: false,
        fps: 60,
        type: 'OVERRIDE',
        loading: false,
      });
      return;
    }

    let isMounted = true;

    async function detect() {
      try {
        const gpu = await getGPUTier();
        if (!isMounted) return;

        setState({
          tier: gpu.tier ?? 1,
          isMobile: gpu.isMobile ?? false,
          fps: gpu.fps ?? 60,
          type: gpu.type ?? 'FALLBACK',
          loading: false,
        });
      } catch {
        if (!isMounted) return;
        setState({
          tier: 1,
          isMobile: false,
          fps: 60,
          type: 'FALLBACK',
          loading: false,
        });
      }
    }

    detect();

    return () => {
      isMounted = false;
    };
  }, [overrideTier]);

  return state;
}
